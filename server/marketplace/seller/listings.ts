import { jsonResponse } from "../../lib/http.js";
import { marketplaceAuthError, requireSeller, slugifyStoreValue } from "../../lib/marketplace.js";
import { getSupabaseAdmin } from "../../lib/supabase.js";

function normalizedListing(body: Record<string, unknown>, approved: boolean) {
  const title = String(body.title ?? "").trim().slice(0, 160);
  const slugBase = String(body.slug ?? title);
  const desiredStatus = String(body.status ?? "draft");
  const status = approved && desiredStatus === "published" ? "published" : "draft";

  return {
    title,
    slug: slugifyStoreValue(slugBase),
    description: String(body.description ?? "").trim().slice(0, 6000),
    category: String(body.category ?? "hardware").trim().slice(0, 50) || "hardware",
    subcategory: String(body.subcategory ?? "RAM").trim().slice(0, 80) || "RAM",
    condition: String(body.condition ?? "Used").trim().slice(0, 80),
    brand: String(body.brand ?? "").trim().slice(0, 100) || null,
    model: String(body.model ?? "").trim().slice(0, 140) || null,
    sku: String(body.sku ?? "").trim().slice(0, 100) || null,
    price_cents: Math.max(0, Math.round(Number(body.priceCents ?? 0))),
    shipping_price_cents: Math.max(0, Math.round(Number(body.shippingPriceCents ?? 0))),
    currency: "usd",
    quantity: Math.max(0, Math.floor(Number(body.quantity ?? 0))),
    status,
    image_urls: Array.isArray(body.imageUrls)
      ? body.imageUrls.map(String).filter(Boolean).slice(0, 8)
      : [],
    specs: typeof body.specs === "object" && body.specs !== null ? body.specs : {},
    shipping_available: Boolean(body.shippingAvailable ?? true),
    local_pickup_available: Boolean(body.localPickupAvailable ?? true),
    cash_sale_allowed: Boolean(body.cashSaleAllowed ?? true),
  };
}

export async function GET(request: Request) {
  try {
    const { seller } = await requireSeller(request);
    const { data, error } = await getSupabaseAdmin()
      .from("store_listings")
      .select("*")
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return jsonResponse({ listings: data ?? [] });
  } catch (error) {
    const auth = marketplaceAuthError(error);
    if (auth) return jsonResponse({ error: auth.message }, auth.status);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to load listings." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const { seller } = await requireSeller(request);
    const body = await request.json() as Record<string, unknown>;
    const listing = normalizedListing(body, seller.status === "approved");

    if (!listing.title) return jsonResponse({ error: "Product title is required." }, 400);
    if (!listing.slug) return jsonResponse({ error: "Product slug could not be generated." }, 400);
    if (listing.price_cents <= 0) return jsonResponse({ error: "Price must be greater than $0." }, 400);
    if (listing.quantity <= 0) return jsonResponse({ error: "Quantity must be at least 1." }, 400);

    const { data, error } = await getSupabaseAdmin()
      .from("store_listings")
      .insert({ ...listing, seller_id: seller.id })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") return jsonResponse({ error: "A product with that URL already exists." }, 409);
      throw new Error(error.message);
    }

    return jsonResponse({ listing: data }, 201);
  } catch (error) {
    const auth = marketplaceAuthError(error);
    if (auth) return jsonResponse({ error: auth.message }, auth.status);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to create listing." }, 500);
  }
}
