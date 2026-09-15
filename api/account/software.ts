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

    const byUser = await supabase.from("store_orders").select("id, auth_user_id, customer_email, product_id, license_id, status, created_at, stripe_mode").eq("stripe_mode", stripeMode).eq("auth_user_id", user.id).order("created_at", { ascending: false });
    if (byUser.error) throw byUser.error;

    const byEmail = await supabase.from("store_orders").select("id, auth_user_id, customer_email, product_id, license_id, status, created_at, stripe_mode").eq("stripe_mode", stripeMode).is("auth_user_id", null).eq("customer_email", email).order("created_at", { ascending: false });
    if (byEmail.error) throw byEmail.error;

    const combined = [...(byUser.data ?? []), ...(byEmail.data ?? [])];
    const unique = Array.from(new Map(combined.map(order => [order.id, order])).values());

    const software = [];
    for (const order of unique) {
      const [productResult, licenseResult] = await Promise.all([
        supabase.from("products").select("name, slug, current_version").eq("id", order.product_id).single(),
        supabase.from("licenses").select("license_key, status").eq("id", order.license_id).single(),
      ]);
      if (productResult.error) throw productResult.error;
      if (licenseResult.error) throw licenseResult.error;
      if (!productResult.data || !licenseResult.data) continue;

      if (!order.auth_user_id) {
        await supabase.from("store_orders").update({ auth_user_id: user.id }).eq("id", order.id);
      }

      software.push({
        orderId: order.id,
        productSlug: productResult.data.slug,
        productName: productResult.data.name,
        licenseKey: licenseResult.data.license_key,
        status: licenseResult.data.status,
        version: productResult.data.current_version || "0.12.2",
        purchasedAt: order.created_at,
        downloadUrl: `/api/download?order_id=${encodeURIComponent(order.id)}`,
        environment: stripeMode,
      });
    }

    return jsonResponse({ software, environment: stripeMode });
  } catch (error) {
    console.error(error);
    if (isAuthError(error)) return jsonResponse({ error: "Sign in to view your software." }, 401);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to load software." }, 500);
  }
}
