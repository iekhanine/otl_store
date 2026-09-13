import { supabase } from "../lib/supabase";

export type OrderResult = {
  ready: boolean;
  paymentStatus?: string;
  product?: { slug: string; name: string };
  email?: string;
  licenseKey?: string;
  status?: string;
  downloadUrl?: string;
  error?: string;
};

export type SoftwareEntitlement = {
  orderId: string;
  productSlug: string;
  productName: string;
  licenseKey: string;
  status: string;
  version: string;
  purchasedAt: string;
  downloadUrl: string;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to continue.");
  return { Authorization: `Bearer ${token}` };
}

async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const raw = await response.text();
  if (!raw.trim()) throw new Error(fallbackMessage);
  try { return JSON.parse(raw) as T; }
  catch { throw new Error(fallbackMessage); }
}

export async function startStreamSafeCheckout() {
  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: await authHeaders(),
  });
  const body = await readApiJson<{ url?: string; error?: string }>(response, "Unable to start checkout.");
  if (!response.ok || !body.url) throw new Error(body.error || "Unable to start checkout.");
  window.location.assign(body.url);
}

export async function getOrder(sessionId: string): Promise<OrderResult> {
  const response = await fetch(`/api/order?session_id=${encodeURIComponent(sessionId)}`, {
    cache: "no-store",
    headers: await authHeaders(),
  });
  const body = await readApiJson<OrderResult>(response, "Unable to retrieve order.");
  if (!response.ok && response.status !== 202) throw new Error(body.error || "Unable to retrieve order.");
  return body;
}

export async function getMySoftware(): Promise<SoftwareEntitlement[]> {
  const response = await fetch("/api/account/software", {
    cache: "no-store",
    headers: await authHeaders(),
  });
  const body = await readApiJson<{ software?: SoftwareEntitlement[]; error?: string }>(response, "Unable to load your software.");
  if (!response.ok) throw new Error(body.error || "Unable to load your software.");
  return body.software ?? [];
}

export async function downloadSoftware(downloadEndpoint: string): Promise<void> {
  const response = await fetch(downloadEndpoint, {
    method: "GET",
    cache: "no-store",
    headers: await authHeaders(),
  });
  const body = await readApiJson<{ url?: string; error?: string }>(
    response,
    "Unable to prepare your download.",
  );
  if (!response.ok || !body.url) {
    throw new Error(body.error || "Unable to prepare your download.");
  }
  window.location.assign(body.url);
}
