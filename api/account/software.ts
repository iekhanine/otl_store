import { requireStoreUser, isAuthError } from "../../server/lib/auth.js";
import { jsonResponse } from "../../server/lib/http.js";
import { getSupabaseAdmin } from "../../server/lib/supabase.js";
import { getStripeMode } from "../../server/lib/stripe.js";

export async function GET(request: Request) {
  try {
    const user = await requireStoreUser(request);
    const supabase = getSupabaseAdmin();
    const email = user.email!.trim().toLowerCase();
    const stripeMode = getStripeMode();

    // Claim any older purchase made with this email before the Store account
    // was attached, then ensure it has a durable software entitlement.
    const legacyOrders = await supabase
      .from("store_orders")
      .select("id, auth_user_id, customer_email, product_id, license_id, created_at, stripe_mode")
      .eq("stripe_mode", stripeMode)
      .eq("customer_email", email)
      .order("created_at", { ascending: false });

    if (legacyOrders.error) throw legacyOrders.error;

    for (const order of legacyOrders.data ?? []) {
      if (!order.auth_user_id) {
        const claim = await supabase
          .from("store_orders")
          .update({ auth_user_id: user.id })
          .eq("id", order.id)
          .is("auth_user_id", null);
        if (claim.error) throw claim.error;
      }

      const entitlementInsert = await supabase
        .from("software_entitlements")
        .upsert({
          auth_user_id: user.id,
          product_id: order.product_id,
          license_id: order.license_id,
          source: "purchase",
          download_enabled: true,
          granted_at: order.created_at,
          notes: "Store purchase entitlement.",
        }, { onConflict: "license_id", ignoreDuplicates: true });

      if (entitlementInsert.error) throw entitlementInsert.error;
    }

    const entitlementResult = await supabase
      .from("software_entitlements")
      .select("id, product_id, license_id, source, download_enabled, granted_at, revoked_at")
      .eq("auth_user_id", user.id)
      .order("granted_at", { ascending: false });

    if (entitlementResult.error) throw entitlementResult.error;

    const software = [];
    for (const entitlement of entitlementResult.data ?? []) {
      const [productResult, licenseResult] = await Promise.all([
        supabase
          .from("products")
          .select("name, slug, current_version")
          .eq("id", entitlement.product_id)
          .single(),
        supabase
          .from("licenses")
          .select("license_key, status")
          .eq("id", entitlement.license_id)
          .single(),
      ]);

      if (productResult.error) throw productResult.error;
      if (licenseResult.error) throw licenseResult.error;
      if (!productResult.data || !licenseResult.data) continue;

      const canDownload =
        licenseResult.data.status === "active" &&
        entitlement.download_enabled &&
        !entitlement.revoked_at;

      software.push({
        entitlementId: entitlement.id,
        licenseId: entitlement.license_id,
        productSlug: productResult.data.slug,
        productName: productResult.data.name,
        licenseKey: licenseResult.data.license_key,
        status: licenseResult.data.status,
        version: productResult.data.current_version || "",
        purchasedAt: entitlement.granted_at,
        source: entitlement.source,
        canDownload,
        downloadUrl: canDownload
          ? `/api/download?license_id=${encodeURIComponent(entitlement.license_id)}`
          : null,
        environment: stripeMode,
      });
    }

    return jsonResponse({ software, environment: stripeMode });
  } catch (error) {
    console.error(error);
    if (isAuthError(error)) {
      return jsonResponse({ error: "Sign in to view your software." }, 401);
    }
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to load software." },
      500,
    );
  }
}
