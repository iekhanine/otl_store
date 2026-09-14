import { requireStoreUser, isAuthError } from "../server/lib/auth.js";
import { requireEnv, storePublicUrl } from "../server/lib/env.js";
import { jsonResponse } from "../server/lib/http.js";
import { getStripe } from "../server/lib/stripe.js";

export async function POST(request: Request) {
  try {
    const user = await requireStoreUser(request);
    const stripe = getStripe();
    const storeUrl = storePublicUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      customer_email: user.email,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      line_items: [{ price: requireEnv("STRIPE_STREAMSAFE_PRICE_ID"), quantity: 1 }],
      metadata: {
        product_slug: "streamsafe",
        license_type: "perpetual",
        otl_user_id: user.id,
      },
      success_url: `${storeUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${storeUrl}/streamsafe`,
    });

    if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error(error);
    if (isAuthError(error)) return jsonResponse({ error: "Sign in to purchase StreamSafe." }, 401);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to start checkout." }, 500);
  }
}
