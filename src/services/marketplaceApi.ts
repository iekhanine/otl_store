import { supabase } from "../lib/supabase";

export type SellerStatus = "pending" | "approved" | "suspended";
export type ListingStatus = "draft" | "published" | "sold_out" | "archived";

export type SellerProfile = {
  id: string;
  auth_user_id: string;
  email: string;
  display_name: string;
  slug: string;
  status: SellerStatus;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  created_at: string;
  updated_at: string;
};


export type SellerApplicationStatus =
  | "pending"
  | "approved"
  | "rejected";

export type SellerApplication = {
  id: string;
  auth_user_id: string;
  email: string;
  display_name: string;
  slug: string;
  selling_description: string;
  status: SellerApplicationStatus;
  seller_id: string | null;
  review_note: string | null;
  reviewed_by_auth_user_id: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SellerApplicationInput = {
  displayName: string;
  slug: string;
  sellingDescription: string;
};

export type MarketplaceListing = {
  id: string;
  seller_id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  condition: string;
  brand: string | null;
  model: string | null;
  sku: string | null;
  price_cents: number;
  shipping_price_cents: number;
  currency: string;
  quantity: number;
  status: ListingStatus;
  image_urls: string[];
  specs: Record<string, string | number | boolean | null>;
  shipping_available: boolean;
  local_pickup_available: boolean;
  cash_sale_allowed: boolean;
  created_at: string;
  updated_at: string;
  store_sellers?: {
    display_name: string;
    slug: string;
    status: SellerStatus;
  } | null;
};

export type SellerSale = {
  id: string;
  listing_id: string | null;
  channel: "cash" | "stripe" | "manual";
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  processor_fee_cents: number;
  platform_fee_cents: number;
  buyer_name: string | null;
  buyer_contact: string | null;
  cash_note: string | null;
  payment_status: string;
  fulfillment_status: string;
  sold_at: string;
  created_at: string;
  archived_at: string | null;
  store_listings?: { title: string; slug: string } | null;
};

export type ListingInput = {
  title: string;
  description: string;
  condition: string;
  brand: string;
  model: string;
  sku: string;
  priceCents: number;
  shippingPriceCents: number;
  quantity: number;
  status: "draft" | "published";
  imageUrls: string[];
  specs: Record<string, string | number | boolean | null>;
  shippingAvailable: boolean;
  localPickupAvailable: boolean;
  cashSaleAllowed: boolean;
  category?: string;
  subcategory?: string;
  slug?: string;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to continue.");
  return { Authorization: `Bearer ${token}` };
}

async function apiJson<T>(response: Response, fallback: string): Promise<T> {
  const raw = await response.text();
  let body: { error?: string } & Partial<T> = {};
  if (raw.trim()) {
    try {
      body = JSON.parse(raw) as { error?: string } & Partial<T>;
    } catch {
      throw new Error(fallback);
    }
  }
  if (!response.ok) throw new Error(body.error || fallback);
  return body as T;
}

export function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export async function getMarketplaceListings(limit = 48): Promise<MarketplaceListing[]> {
  const response = await fetch(`/api/marketplace/products?limit=${limit}`, { cache: "no-store" });
  const body = await apiJson<{ products: MarketplaceListing[] }>(response, "Unable to load hardware.");
  return body.products ?? [];
}

export async function getMarketplaceListing(slug: string): Promise<MarketplaceListing> {
  const response = await fetch(`/api/marketplace/products?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
  const body = await apiJson<{ product: MarketplaceListing }>(response, "Unable to load product.");
  return body.product;
}

export async function getSellerProfile(): Promise<SellerProfile | null> {
  const response = await fetch("/api/seller/profile", { cache: "no-store", headers: await authHeaders() });
  const body = await apiJson<{ seller: SellerProfile | null }>(response, "Unable to load seller profile.");
  return body.seller ?? null;
}


export async function getSellerApplication(): Promise<SellerApplication | null> {
  const response = await fetch(
    "/api/seller/application",
    {
      cache: "no-store",
      headers: await authHeaders(),
    },
  );

  const body = await apiJson<{ application: SellerApplication | null }>(
    response,
    "Unable to load seller application.",
  );

  return body.application ?? null;
}

export async function submitSellerApplication(
  input: SellerApplicationInput,
): Promise<SellerApplication> {
  const response = await fetch(
    "/api/seller/application",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify(input),
    },
  );

  const body = await apiJson<{ application: SellerApplication }>(
    response,
    "Unable to submit seller application.",
  );

  return body.application;
}

export async function createSellerProfile(displayName: string, slug: string): Promise<SellerProfile> {
  const response = await fetch("/api/seller/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ displayName, slug }),
  });
  const body = await apiJson<{ seller: SellerProfile }>(response, "Unable to create seller profile.");
  return body.seller;
}

export async function getSellerListings(): Promise<MarketplaceListing[]> {
  const response = await fetch("/api/seller/listings", { cache: "no-store", headers: await authHeaders() });
  const body = await apiJson<{ listings: MarketplaceListing[] }>(response, "Unable to load listings.");
  return body.listings ?? [];
}

export async function createListing(input: ListingInput): Promise<MarketplaceListing> {
  const response = await fetch("/api/seller/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(input),
  });
  const body = await apiJson<{ listing: MarketplaceListing }>(response, "Unable to create listing.");
  return body.listing;
}

export async function updateListing(id: string, input: Omit<Partial<ListingInput>, "status"> & { status?: ListingStatus }): Promise<MarketplaceListing> {
  const response = await fetch(`/api/seller/listing?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(input),
  });
  const body = await apiJson<{ listing: MarketplaceListing }>(response, "Unable to update listing.");
  return body.listing;
}

export async function recordCashSale(input: {
  listingId: string;
  quantity: number;
  unitPriceCents: number;
  buyerName?: string;
  buyerContact?: string;
  note?: string;
}): Promise<string> {
  const response = await fetch("/api/seller/cash-sale", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(input),
  });
  const body = await apiJson<{ saleId: string }>(response, "Unable to record cash sale.");
  return body.saleId;
}

export async function getSellerSales(archived = false): Promise<SellerSale[]> {
  const response = await fetch(
    `/api/seller/sales${archived ? "?archived=1" : ""}`,
    { cache: "no-store", headers: await authHeaders() },
  );
  const body = await apiJson<{ sales: SellerSale[] }>(response, "Unable to load sales.");
  return body.sales ?? [];
}

export async function archiveSellerSale(saleId: string): Promise<void> {
  const response = await fetch("/api/seller/sales", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify({ saleId }),
  });

  await apiJson(response, "Unable to archive sale.");
}

export async function uploadListingImages(files: File[], userId: string): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files.slice(0, 8)) {
    if (!file.type.startsWith("image/")) {
      throw new Error(`${file.name} is not an image.`);
    }

    // Seller photos are regenerated as web-friendly files before they
    // reach this function. Keep a hard post-processing ceiling aligned
    // with the Supabase storage bucket configuration.
    if (file.size > 6 * 1024 * 1024) {
      throw new Error(`${file.name} could not be reduced below the 6 MB Store image limit.`);
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
    const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "webp";
    const path = `${userId}/${crypto.randomUUID()}.${safeExtension}`;

    const { error } = await supabase.storage
      .from("store-product-images")
      .upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("store-product-images")
      .getPublicUrl(path);

    urls.push(data.publicUrl);
  }

  return urls;
}

export type AdminMarketplaceData = {
  sellers: SellerProfile[];
  listings: Array<MarketplaceListing & { store_sellers?: { display_name: string; email: string; status: SellerStatus } | null }>;
  sales: Array<SellerSale & { store_sellers?: { display_name: string } | null }>;
};

export async function getMarketplaceAdmin(): Promise<AdminMarketplaceData> {
  const response = await fetch("/api/admin/marketplace", { cache: "no-store", headers: await authHeaders() });
  return apiJson<AdminMarketplaceData>(response, "Unable to load marketplace administration.");
}

export async function setSellerStatus(sellerId: string, status: SellerStatus): Promise<void> {
  const response = await fetch("/api/admin/seller-status", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ sellerId, status }),
  });
  await apiJson(response, "Unable to update seller.");
}

export async function setListingStatus(listingId: string, status: ListingStatus): Promise<void> {
  const response = await fetch("/api/admin/listing-status", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ listingId, status }),
  });
  await apiJson(response, "Unable to update listing.");
}
