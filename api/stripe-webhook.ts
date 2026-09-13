import type Stripe from "stripe";
import { requireEnv } from "./_lib/env";
import { fulfillCheckoutSession } from "./_lib/fulfillment";
import { jsonResponse } from "./_lib/http";
import { getStripe } from "./_lib/stripe";

export async function POST(request: Request) {

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse({ error: "Missing Stripe signature." }, 400);
  }

  try {
    const rawBody = await request.text();
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      requireEnv("STRIPE_WEBHOOK_SECRET"),
    );

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") {
        await fulfillCheckoutSession(session);
      }
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error("Stripe webhook failed:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook verification failed.",
      },
      400,
    );
  }
}
