import { requireEnv } from "./_lib/env.js";
import { fulfillCheckoutSession } from "./_lib/fulfillment.js";
import { jsonResponse } from "./_lib/http.js";
import { getStripe } from "./_lib/stripe.js";

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
      return jsonResponse({ error: "This order is not paid." }, 403);
    }

    await fulfillCheckoutSession(session);

    return Response.redirect(
      requireEnv("STREAMSAFE_DOWNLOAD_URL"),
      302,
    );
  } catch (error) {
    console.error(error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to download StreamSafe.",
      },
      500,
    );
  }
}
