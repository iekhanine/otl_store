export type OrderResult = {
  ready: boolean;
  paymentStatus?: string;
  product?: {
    slug: string;
    name: string;
  };
  email?: string;
  licenseKey?: string;
  status?: string;
  downloadUrl?: string;
  error?: string;
};

export async function startStreamSafeCheckout() {
  const response = await fetch(
    "/api/create-checkout-session",
    { method: "POST" },
  );

  const body = await response.json() as {
    url?: string;
    error?: string;
  };

  if (!response.ok || !body.url) {
    throw new Error(body.error || "Unable to start checkout.");
  }

  window.location.assign(body.url);
}

export async function getOrder(sessionId: string): Promise<OrderResult> {
  const response = await fetch(
    `/api/order?session_id=${encodeURIComponent(sessionId)}`,
    { cache: "no-store" },
  );

  const body = await response.json() as OrderResult;
  if (!response.ok && response.status !== 202) {
    throw new Error(body.error || "Unable to retrieve order.");
  }

  return body;
}
