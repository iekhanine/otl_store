import { isAuthError, requireStoreUser } from "../server/lib/auth.js";
import { createPrivateSoftwareUrl } from "../server/lib/downloadStorage.js";
import { issueEntitlementDownloadToken, redeemDownloadToken } from "../server/lib/downloadTokens.js";
import { storePublicUrl } from "../server/lib/env.js";
import { jsonResponse } from "../server/lib/http.js";
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

  // Possession of a valid temporary token is sufficient for redemption.
  if (token) {
    return redeemTokenAndRedirect(token);
  }

  try {
    const user = await requireStoreUser(request);
    const licenseId = url.searchParams.get("license_id")?.trim();

    if (!licenseId) {
      return jsonResponse({ error: "license_id is required." }, 400);
    }

    const supabase = getSupabaseAdmin();

    const entitlementResult = await supabase
      .from("software_entitlements")
      .select("id, auth_user_id, product_id, license_id, download_enabled, revoked_at")
      .eq("license_id", licenseId)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (entitlementResult.error) throw entitlementResult.error;
    const entitlement = entitlementResult.data;

    if (!entitlement) {
      return jsonResponse({ error: "You do not own this software license." }, 403);
    }

    if (!entitlement.download_enabled || entitlement.revoked_at) {
      return jsonResponse({ error: "Downloads are disabled for this license." }, 403);
    }

    const licenseResult = await supabase
      .from("licenses")
      .select("status")
      .eq("id", entitlement.license_id)
      .maybeSingle();

    if (licenseResult.error) throw licenseResult.error;
    if (!licenseResult.data || licenseResult.data.status !== "active") {
      return jsonResponse({ error: "This software license is not active." }, 403);
    }

    const product = await getStoreSoftwareProductById(entitlement.product_id);
    if (!product.download_provider || !product.download_bucket || !product.download_object_key) {
      return jsonResponse({ error: "This product does not have a download artifact configured." }, 503);
    }

    const rawToken = await issueEntitlementDownloadToken({
      productId: product.id,
      entitlementId: entitlement.id,
      licenseId: entitlement.license_id,
      recipientEmail: user.email ?? null,
      ttlSeconds: product.download_token_ttl_seconds || 600,
      maxUses: 1,
      source: "account",
    });

    const oneTimeUrl = `${storePublicUrl(request)}/api/download?token=${encodeURIComponent(rawToken)}`;
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
