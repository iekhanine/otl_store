import { requireStoreUser, isAuthError } from "./_lib/auth.js";
import { fulfillCheckoutSession } from "./_lib/fulfillment.js";
import { jsonResponse } from "./_lib/http.js";
import { getStripe } from "./_lib/stripe.js";
import { getSupabaseAdmin } from "./_lib/supabase.js";

const BUCKET = process.env.STREAMSAFE_STORAGE_BUCKET?.trim() || "software-releases";
const PATH = process.env.STREAMSAFE_STORAGE_PATH?.trim() || "streamsafe/StreamSafeSetup.exe";

export async function GET(request: Request) {
  try {
    const user = await requireStoreUser(request);
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id")?.trim();
    const orderId = url.searchParams.get("order_id")?.trim();
    const supabase = getSupabaseAdmin();

    let order: any = null;

    if (sessionId) {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") return jsonResponse({ error: "This order is not paid." }, 403);

      const checkoutUserId = session.metadata?.otl_user_id ?? null;
      const checkoutEmail = session.customer_details?.email?.trim().toLowerCase() ?? session.customer_email?.trim().toLowerCase() ?? null;
      const userEmail = user.email?.trim().toLowerCase() ?? null;
      if (checkoutUserId && checkoutUserId !== user.id) return jsonResponse({ error: "This purchase belongs to another account." }, 403);
      if (!checkoutUserId && checkoutEmail && checkoutEmail !== userEmail) return jsonResponse({ error: "This purchase belongs to another account." }, 403);

      await fulfillCheckoutSession(session);
      const result = await supabase.from("store_orders").select("id, auth_user_id, customer_email, product_id").eq("checkout_session_id", sessionId).single();
      if (result.error) throw result.error;
      order = result.data;
    } else if (orderId) {
      const result = await supabase.from("store_orders").select("id, auth_user_id, customer_email, product_id").eq("id", orderId).single();
      if (result.error) throw result.error;
      order = result.data;
    } else {
      return jsonResponse({ error: "order_id or session_id is required." }, 400);
    }

    const userEmail = user.email!.trim().toLowerCase();
    const ownsOrder = order.auth_user_id === user.id || String(order.customer_email).toLowerCase() === userEmail;
    if (!ownsOrder) return jsonResponse({ error: "You do not own this software license." }, 403);

    if (!order.auth_user_id) {
      await supabase.from("store_orders").update({ auth_user_id: user.id }).eq("id", order.id);
    }

    const productResult = await supabase.from("products").select("slug").eq("id", order.product_id).single();
    if (productResult.error) throw productResult.error;
    if (productResult.data?.slug !== "streamsafe") return jsonResponse({ error: "This download is not available for the selected product." }, 403);

    const signed = await supabase.storage.from(BUCKET).createSignedUrl(PATH, 300, { download: "StreamSafeSetup.exe" });
    if (signed.error || !signed.data?.signedUrl) throw new Error(signed.error?.message || "Unable to create private download link.");

    return jsonResponse({ url: signed.data.signedUrl });
  } catch (error) {
    console.error(error);
    if (isAuthError(error)) return jsonResponse({ error: "Sign in to download StreamSafe." }, 401);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to download StreamSafe." }, 500);
  }
}
