import { requireStoreUser, isAuthError } from "../server/lib/auth.js";
import { storePublicUrl } from "../server/lib/env.js";
import { jsonResponse, readJson } from "../server/lib/http.js";
import { getStripe, getStripeMode } from "../server/lib/stripe.js";
import {
  getStoreSoftwareProduct,
  resolveStripePriceId,
} from "../server/lib/storeProducts.js";

type CheckoutPayload = {
  productSlug?: unknown;
};

export async function POST(request: Request) {
  try {
    const user = await requireStoreUser(request);
    const body = await readJson<CheckoutPayload>(request);
    const productSlug =
      typeof body.productSlug === "string"
        ? body.productSlug.trim().toLowerCase()
        : "";

    if (!productSlug) {
      return jsonResponse({ error: "Product slug is required." }, 400);
    }

    const product = await getStoreSoftwareProduct(productSlug, true);
    const stripePriceId = await resolveStripePriceId(product);
    const stripe = getStripe();
    const stripeMode = getStripeMode();
    const storeUrl = storePublicUrl();
    const productPath =
      product.slug === "streamsafe"
        ? "/streamsafe"
        : `/software/${encodeURIComponent(product.slug)}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      customer_email: user.email,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      line_items: [{ price: stripePriceId, quantity: 1 }],
      metadata: {
        product_slug: product.slug,
        license_type: "perpetual",
        otl_user_id: user.id,
        stripe_mode: stripeMode,
      },
      success_url: `${storeUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${storeUrl}${productPath}`,
    });

    if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error(error);
    if (isAuthError(error)) {
      return jsonResponse({ error: "Sign in to purchase software." }, 401);
    }
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to start checkout." },
      500,
    );
  }
}
