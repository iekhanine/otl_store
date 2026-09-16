import { isAuthError, requireStoreUser } from "../../server/lib/auth.js";
import { jsonResponse } from "../../server/lib/http.js";
import { getSupabaseAdmin } from "../../server/lib/supabase.js";
import { getStripeMode } from "../../server/lib/stripe.js";

type EntitlementRow = {
  id: string;
  auth_user_id: string;
  product_id: string;
  license_id: string;
  source: string;
  download_enabled: boolean;
  granted_at: string;
  revoked_at: string | null;
};

export async function GET(request: Request) {
  try {
    const user = await requireStoreUser(request);
    const supabase = getSupabaseAdmin();
    const email = user.email?.trim().toLowerCase() ?? "";
    const stripeMode = getStripeMode();

    // Legacy Store orders are best-effort only. A malformed or historical
    // order must never prevent manually assigned Platform entitlements from
    // appearing in My Software.
    if (email) {
      try {
        const legacyOrders = await supabase
          .from("store_orders")
          .select("id, auth_user_id, customer_email, product_id, license_id, created_at, stripe_mode")
          .eq("stripe_mode", stripeMode)
          .eq("customer_email", email)
          .order("created_at", { ascending: false });

        if (legacyOrders.error) {
          console.error("Unable to inspect legacy Store orders:", legacyOrders.error);
        } else {
          for (const order of legacyOrders.data ?? []) {
            if (!order.license_id) continue;

            if (!order.auth_user_id) {
              const claim = await supabase
                .from("store_orders")
                .update({ auth_user_id: user.id })
                .eq("id", order.id)
                .is("auth_user_id", null);

              if (claim.error) {
                console.error("Unable to claim legacy Store order:", order.id, claim.error);
              }
            }

            const entitlementInsert = await supabase
              .from("software_entitlements")
              .upsert(
                {
                  auth_user_id: user.id,
                  product_id: order.product_id,
                  license_id: order.license_id,
                  source: "purchase",
                  download_enabled: true,
                  granted_at: order.created_at,
                  notes: "Store purchase entitlement.",
                },
                { onConflict: "license_id", ignoreDuplicates: true },
              );

            if (entitlementInsert.error) {
              console.error("Unable to backfill Store entitlement:", order.id, entitlementInsert.error);
            }
          }
        }
      } catch (legacyError) {
        console.error("Legacy Store entitlement backfill failed:", legacyError);
      }
    }

    // Platform assignments are authoritative. Load them directly from the
    // durable entitlement table rather than requiring a Store order.
    const entitlementResult = await supabase
      .from("software_entitlements")
      .select("id, auth_user_id, product_id, license_id, source, download_enabled, granted_at, revoked_at")
      .eq("auth_user_id", user.id)
      .order("granted_at", { ascending: false });

    if (entitlementResult.error) {
      throw new Error(`Unable to load software entitlements: ${entitlementResult.error.message}`);
    }

    const entitlements = (entitlementResult.data ?? []) as EntitlementRow[];
    if (entitlements.length === 0) {
      return jsonResponse({ software: [], environment: stripeMode });
    }

    const productIds = Array.from(new Set(entitlements.map(item => item.product_id)));
    const licenseIds = Array.from(new Set(entitlements.map(item => item.license_id)));

    const [productsResult, licensesResult] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, slug, current_version")
        .in("id", productIds),
      supabase
        .from("licenses")
        .select("id, license_key, status")
        .in("id", licenseIds),
    ]);

    if (productsResult.error) {
      throw new Error(`Unable to load software products: ${productsResult.error.message}`);
    }
    if (licensesResult.error) {
      throw new Error(`Unable to load software licenses: ${licensesResult.error.message}`);
    }

    const productMap = new Map((productsResult.data ?? []).map(product => [product.id, product]));
    const licenseMap = new Map((licensesResult.data ?? []).map(license => [license.id, license]));

    const software = entitlements.flatMap(entitlement => {
      const product = productMap.get(entitlement.product_id);
      const license = licenseMap.get(entitlement.license_id);

      // One broken historical row should not take down the entire account page.
      if (!product || !license) {
        console.error("Skipping incomplete software entitlement", {
          entitlementId: entitlement.id,
          productId: entitlement.product_id,
          licenseId: entitlement.license_id,
          hasProduct: Boolean(product),
          hasLicense: Boolean(license),
        });
        return [];
      }

      const canDownload =
        license.status === "active" &&
        entitlement.download_enabled &&
        !entitlement.revoked_at;

      return [{
        entitlementId: entitlement.id,
        licenseId: entitlement.license_id,
        productSlug: product.slug,
        productName: product.name,
        licenseKey: license.license_key,
        status: license.status,
        version: product.current_version || "",
        purchasedAt: entitlement.granted_at,
        source: entitlement.source,
        canDownload,
        downloadUrl: canDownload
          ? `/api/download?license_id=${encodeURIComponent(entitlement.license_id)}`
          : null,
        environment: stripeMode,
      }];
    });

    return jsonResponse({ software, environment: stripeMode });
  } catch (error) {
    console.error("Account software error:", error);
    if (isAuthError(error)) {
      return jsonResponse({ error: "Sign in to view your software." }, 401);
    }
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to load software." },
      500,
    );
  }
}
