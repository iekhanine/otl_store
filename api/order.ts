import { requireStoreUser, isAuthError } from "../server/lib/auth.js";
import { fulfillCheckoutSession } from "../server/lib/fulfillment.js";
import { jsonResponse } from "../server/lib/http.js";
import { getStripe } from "../server/lib/stripe.js";

export async function GET(request: Request) {
  try {
    const user = await requireStoreUser(request);
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id")?.trim();
    if (!sessionId) return jsonResponse({ error: "session_id is required." }, 400);

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const checkoutUserId = session.metadata?.otl_user_id ?? null;
    const checkoutEmail = session.customer_details?.email?.trim().toLowerCase() ?? session.customer_email?.trim().toLowerCase() ?? null;
    const userEmail = user.email?.trim().toLowerCase() ?? null;

    if (checkoutUserId && checkoutUserId !== user.id) return jsonResponse({ error: "This purchase belongs to another account." }, 403);
    if (!checkoutUserId && checkoutEmail && checkoutEmail !== userEmail) return jsonResponse({ error: "This purchase belongs to another account." }, 403);

    if (session.payment_status !== "paid") return jsonResponse({ ready: false, paymentStatus: session.payment_status }, 202);

    const order = await fulfillCheckoutSession(session);
    return jsonResponse({
      ready: true,
      product: { slug: order.productSlug, name: order.productName },
      email: order.customerEmail,
      licenseKey: order.licenseKey,
      status: order.status,
      downloadUrl: `/api/download?session_id=${encodeURIComponent(session.id)}`,
    });
  } catch (error) {
    console.error(error);
    if (isAuthError(error)) return jsonResponse({ error: "Sign in to view this purchase." }, 401);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to retrieve the order." }, 500);
  }
}
