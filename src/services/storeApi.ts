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

async function readApiJson<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    if (import.meta.env.DEV) {
      throw new Error(
        "The Store API is not running. `npm run dev` starts only Vite. " +
        "Use `vercel dev` when testing Stripe and licensing locally.",
      );
    }

    throw new Error(fallbackMessage);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    if (import.meta.env.DEV) {
      throw new Error(
        "The Store API returned a non-JSON response. " +
        "Use `vercel dev` instead of `npm run dev` when testing checkout.",
      );
    }

    throw new Error(fallbackMessage);
  }
}

export async function startStreamSafeCheckout() {
  const response = await fetch(
    "/api/create-checkout-session",
    { method: "POST" },
  );

  const body = await readApiJson<{
    url?: string;
    error?: string;
  }>(
    response,
    "Unable to start checkout.",
  );

  if (!response.ok || !body.url) {
    throw new Error(
      body.error ||
      "Unable to start checkout.",
    );
  }

  window.location.assign(body.url);
}

export async function getOrder(
  sessionId: string,
): Promise<OrderResult> {
  const response = await fetch(
    `/api/order?session_id=${encodeURIComponent(sessionId)}`,
    { cache: "no-store" },
  );

  const body = await readApiJson<OrderResult>(
    response,
    "Unable to retrieve order.",
  );

  if (!response.ok && response.status !== 202) {
    throw new Error(
      body.error ||
      "Unable to retrieve order.",
    );
  }

  return body;
}
