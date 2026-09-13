import { fulfillCheckoutSession } from "./_lib/fulfillment";
import { jsonResponse } from "./_lib/http";
import { getStripe } from "./_lib/stripe";

export async function GET(request: Request) {

  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id")?.trim();
    if (!sessionId) {
      return jsonResponse({ error: "session_id is required." }, 400);
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return jsonResponse(
        { ready: false, paymentStatus: session.payment_status },
        202,
      );
    }

    const order = await fulfillCheckoutSession(session);

    return jsonResponse({
      ready: true,
      product: {
        slug: order.productSlug,
        name: order.productName,
      },
      email: order.customerEmail,
      licenseKey: order.licenseKey,
      status: order.status,
      downloadUrl:
        `/api/download?session_id=${encodeURIComponent(session.id)}`,
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve the order.",
      },
      500,
    );
  }
}
