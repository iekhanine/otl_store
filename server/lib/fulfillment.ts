import type Stripe from "stripe";
import { getSupabaseAdmin } from "./supabase.js";

export type FulfilledOrder = {
  orderId: string;
  customerId: string;
  licenseId: string;
  licenseKey: string;
  customerEmail: string;
  productSlug: string;
  productName: string;
  status: string;
  stripeMode: "live" | "test";
};

function idOf(
  value: string | { id: string } | null,
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<FulfilledOrder> {
  if (session.payment_status !== "paid") {
    throw new Error("Checkout Session is not paid yet.");
  }

  const stripeMode = session.livemode ? "live" : "test";

  const productSlug =
    session.metadata?.product_slug?.trim().toLowerCase() ||
    "streamsafe";

  const email = session.customer_details?.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("Stripe did not return a customer email address.");
  }

  const customerName =
    session.customer_details?.name?.trim() ||
    email;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc(
    "fulfill_store_checkout",
    {
      p_checkout_session_id: session.id,
      p_payment_intent_id: idOf(session.payment_intent),
      p_stripe_customer_id: idOf(session.customer),
      p_customer_email: email,
      p_customer_name: customerName,
      p_product_slug: productSlug,
      p_amount_total: session.amount_total ?? 0,
      p_currency: session.currency ?? "usd",
      p_auth_user_id: session.metadata?.otl_user_id ?? null,
      p_stripe_mode: stripeMode,
    },
  );

  if (error) {
    throw new Error(`Store fulfillment failed: ${error.message}`);
  }

  const result = data as Record<string, unknown> | null;
  if (!result) {
    throw new Error("Store fulfillment did not return an order.");
  }

  const licenseId = String(result.license_id ?? "");
  const productIdResult = await supabase
    .from("products")
    .select("id")
    .eq("slug", productSlug)
    .maybeSingle();

  if (productIdResult.error) {
    throw new Error(`Unable to resolve product entitlement: ${productIdResult.error.message}`);
  }

  const authUserId = session.metadata?.otl_user_id ?? null;
  if (authUserId && licenseId && productIdResult.data?.id) {
    const entitlementResult = await supabase
      .from("software_entitlements")
      .upsert({
        auth_user_id: authUserId,
        product_id: productIdResult.data.id,
        license_id: licenseId,
        source: "purchase",
        download_enabled: true,
        notes: "Perpetual entitlement created from Stripe purchase.",
      }, { onConflict: "license_id", ignoreDuplicates: true });

    if (entitlementResult.error) {
      throw new Error(`Unable to create software entitlement: ${entitlementResult.error.message}`);
    }
  }

  return {
    orderId: String(result.order_id ?? ""),
    customerId: String(result.customer_id ?? ""),
    licenseId: String(result.license_id ?? ""),
    licenseKey: String(result.license_key ?? ""),
    customerEmail: String(result.customer_email ?? email),
    productSlug: String(result.product_slug ?? productSlug),
    productName: String(result.product_name ?? "StreamSafe"),
    status: String(result.status ?? "fulfilled"),
    stripeMode,
  };
}
