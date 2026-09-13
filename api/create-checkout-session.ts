import { requireEnv, storePublicUrl } from "./_lib/env";
import { jsonResponse } from "./_lib/http";
import { getStripe } from "./_lib/stripe";

export async function POST(request: Request) {

  try {
    const stripe = getStripe();
    const storeUrl = storePublicUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      line_items: [
        {
          price: requireEnv("STRIPE_STREAMSAFE_PRICE_ID"),
          quantity: 1,
        },
      ],
      metadata: {
        product_slug: "streamsafe",
        license_type: "perpetual",
      },
      success_url:
        `${storeUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${storeUrl}/streamsafe`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start checkout.",
      },
      500,
    );
  }
}
