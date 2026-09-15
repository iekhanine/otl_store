import { isAuthError, requireStoreUser } from "../server/lib/auth.js";
import { createPrivateSoftwareUrl } from "../server/lib/downloadStorage.js";
import { issueDownloadToken, redeemDownloadToken } from "../server/lib/downloadTokens.js";
import { storePublicUrl } from "../server/lib/env.js";
import { fulfillCheckoutSession } from "../server/lib/fulfillment.js";
import { jsonResponse } from "../server/lib/http.js";
import { getStripe, getStripeMode } from "../server/lib/stripe.js";
import { getStoreSoftwareProductById } from "../server/lib/storeProducts.js";
import { getSupabaseAdmin } from "../server/lib/supabase.js";

async function redeemTokenAndRedirect(token: string): Promise<Response> {
  try {
    const redeemed = await redeemDownloadToken(token);
    const product = await getStoreSoftwareProductById(redeemed.productId);
    const signedUrl = await createPrivateSoftwareUrl(product);

    return new Response(null, {
      status: 302,
      headers: {
        Location: signedUrl,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Download token redemption failed:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "This download link is invalid or expired.",
      },
      410,
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();

  // The one-time token is intentionally the only credential used by the
  // browser redirect. It is single-use and expires quickly.
  if (token) {
    return redeemTokenAndRedirect(token);
  }

  try {
    const user = await requireStoreUser(request);
    const sessionId = url.searchParams.get("session_id")?.trim();
    const orderId = url.searchParams.get("order_id")?.trim();
    const supabase = getSupabaseAdmin();

    let order: {
      id: string;
      auth_user_id: string | null;
      customer_email: string;
      product_id: string;
      stripe_mode: string;
    } | null = null;

    if (sessionId) {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return jsonResponse({ error: "This order is not paid." }, 403);
      }

      const checkoutUserId = session.metadata?.otl_user_id ?? null;
      const checkoutEmail =
        session.customer_details?.email?.trim().toLowerCase() ??
        session.customer_email?.trim().toLowerCase() ??
        null;
      const userEmail = user.email?.trim().toLowerCase() ?? null;

      if (checkoutUserId && checkoutUserId !== user.id) {
        return jsonResponse({ error: "This purchase belongs to another account." }, 403);
      }
      if (!checkoutUserId && checkoutEmail && checkoutEmail !== userEmail) {
        return jsonResponse({ error: "This purchase belongs to another account." }, 403);
      }

      await fulfillCheckoutSession(session);
      const result = await supabase
        .from("store_orders")
        .select("id, auth_user_id, customer_email, product_id, stripe_mode")
        .eq("stripe_mode", getStripeMode())
        .eq("checkout_session_id", sessionId)
        .single();
      if (result.error) throw result.error;
      order = result.data;
    } else if (orderId) {
      const result = await supabase
        .from("store_orders")
        .select("id, auth_user_id, customer_email, product_id, stripe_mode")
        .eq("id", orderId)
        .single();
      if (result.error) throw result.error;
      order = result.data;
    } else {
      return jsonResponse({ error: "order_id or session_id is required." }, 400);
    }

    if (!order) throw new Error("Order was not found.");
    if (order.stripe_mode !== getStripeMode()) {
      return jsonResponse({ error: "This order belongs to a different Store environment." }, 403);
    }

    const userEmail = user.email!.trim().toLowerCase();
    const ownsOrder =
      order.auth_user_id === user.id ||
      String(order.customer_email).toLowerCase() === userEmail;

    if (!ownsOrder) {
      return jsonResponse({ error: "You do not own this software license." }, 403);
    }

    if (!order.auth_user_id) {
      await supabase
        .from("store_orders")
        .update({ auth_user_id: user.id })
        .eq("id", order.id);
    }

    const product = await getStoreSoftwareProductById(order.product_id);
    if (!product.download_provider || !product.download_bucket || !product.download_object_key) {
      return jsonResponse({ error: "This product does not have a download artifact configured." }, 503);
    }

    const rawToken = await issueDownloadToken({
      orderId: order.id,
      productId: product.id,
      authUserId: user.id,
      ttlSeconds: product.download_token_ttl_seconds || 600,
    });

    const oneTimeUrl = `${storePublicUrl()}/api/download?token=${encodeURIComponent(rawToken)}`;
    return jsonResponse({ url: oneTimeUrl, oneTime: true });
  } catch (error) {
    console.error(error);
    if (isAuthError(error)) {
      return jsonResponse({ error: "Sign in to download your software." }, 401);
    }
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to prepare download." },
      500,
    );
  }
}
