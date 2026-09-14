import { jsonResponse } from "../../lib/http.js";
import { marketplaceAuthError, requireSeller, slugifyStoreValue } from "../../lib/marketplace.js";
import { getSupabaseAdmin } from "../../lib/supabase.js";

export async function PATCH(request: Request) {
  try {
    const { seller } = await requireSeller(request);
    const url = new URL(request.url);
    const id = url.searchParams.get("id")?.trim();
    if (!id) return jsonResponse({ error: "Listing ID is required." }, 400);

    const body = await request.json() as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = String(body.title).trim().slice(0, 160);
    if (body.slug !== undefined) updates.slug = slugifyStoreValue(String(body.slug));
    if (body.description !== undefined) updates.description = String(body.description).trim().slice(0, 6000);
    if (body.category !== undefined) updates.category = String(body.category).trim().slice(0, 50) || "hardware";
    if (body.subcategory !== undefined) updates.subcategory = String(body.subcategory).trim().slice(0, 80) || "Other";
    if (body.condition !== undefined) updates.condition = String(body.condition).trim().slice(0, 80);
    if (body.brand !== undefined) updates.brand = String(body.brand).trim().slice(0, 100) || null;
    if (body.model !== undefined) updates.model = String(body.model).trim().slice(0, 140) || null;
    if (body.sku !== undefined) updates.sku = String(body.sku).trim().slice(0, 100) || null;
    if (body.priceCents !== undefined) updates.price_cents = Math.max(0, Math.round(Number(body.priceCents)));
    if (body.shippingPriceCents !== undefined) updates.shipping_price_cents = Math.max(0, Math.round(Number(body.shippingPriceCents)));
    if (body.quantity !== undefined) updates.quantity = Math.max(0, Math.floor(Number(body.quantity)));
    if (body.imageUrls !== undefined && Array.isArray(body.imageUrls)) updates.image_urls = body.imageUrls.map(String).filter(Boolean).slice(0, 8);
    if (body.specs !== undefined && typeof body.specs === "object" && body.specs !== null) updates.specs = body.specs;
    if (body.shippingAvailable !== undefined) updates.shipping_available = Boolean(body.shippingAvailable);
    if (body.localPickupAvailable !== undefined) updates.local_pickup_available = Boolean(body.localPickupAvailable);
    if (body.cashSaleAllowed !== undefined) updates.cash_sale_allowed = Boolean(body.cashSaleAllowed);

    if (body.status !== undefined) {
      const requested = String(body.status);
      if (requested === "published" && seller.status !== "approved") {
        return jsonResponse({ error: "Seller approval is required before publishing products." }, 403);
      }
      if (["draft", "published", "archived"].includes(requested)) updates.status = requested;
    }

    const { data, error } = await getSupabaseAdmin()
      .from("store_listings")
      .update(updates)
      .eq("id", id)
      .eq("seller_id", seller.id)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return jsonResponse({ error: "Listing not found." }, 404);
    return jsonResponse({ listing: data });
  } catch (error) {
    const auth = marketplaceAuthError(error);
    if (auth) return jsonResponse({ error: auth.message }, auth.status);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to update listing." }, 500);
  }
}
