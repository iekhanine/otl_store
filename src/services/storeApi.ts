import type { StoreProduct, SoftwareType } from "../data/products";
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

type StoreProductApi = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  priceCents: number;
  currency: string;
  version: string;
  platform: string;
  softwareType: string;
  featured?: boolean;
  icon: string;
  features: string[];
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

function formatPrice(priceCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format((priceCents || 0) / 100);
}

function normalizeSoftwareType(value: string): SoftwareType {
  switch (value) {
    case "web":
    case "macos":
    case "linux":
      return value;
    default:
      return "windows";
  }
}

function mapStoreProduct(product: StoreProductApi): StoreProduct {
  return {
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    price: formatPrice(product.priceCents, product.currency),
    version: product.version,
    platform: product.platform,
    softwareType: normalizeSoftwareType(product.softwareType),
    featured: Boolean(product.featured),
    icon: product.icon,
    features: product.features ?? [],
  };
}

export async function getSoftwareProducts(): Promise<StoreProduct[]> {
  const response = await fetch("/api/marketplace?route=software-products", {
    cache: "no-store",
  });
  const body = await readApiJson<{ products?: StoreProductApi[]; error?: string }>(
    response,
    "Unable to load software catalog.",
  );
  if (!response.ok) throw new Error(body.error || "Unable to load software catalog.");
  return (body.products ?? []).map(mapStoreProduct);
}

export async function getSoftwareProduct(slug: string): Promise<StoreProduct> {
  const response = await fetch(
    `/api/marketplace?route=software-products&slug=${encodeURIComponent(slug)}`,
    { cache: "no-store" },
  );
  const body = await readApiJson<{ product?: StoreProductApi; error?: string }>(
    response,
    "Unable to load software product.",
  );
  if (!response.ok || !body.product) {
    throw new Error(body.error || "Software product was not found.");
  }
  return mapStoreProduct(body.product);
}

export async function startProductCheckout(productSlug: string) {
  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      ...(await authHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productSlug }),
  });
  const body = await readApiJson<{ url?: string; error?: string }>(response, "Unable to start checkout.");
  if (!response.ok || !body.url) throw new Error(body.error || "Unable to start checkout.");
  window.location.assign(body.url);
}

export async function startStreamSafeCheckout() {
  return startProductCheckout("streamsafe");
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
