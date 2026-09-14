import { jsonResponse } from "../../lib/http.js";
import { marketplaceAuthError, requireSeller } from "../../lib/marketplace.js";
import { getSupabaseAdmin } from "../../lib/supabase.js";

export async function POST(request: Request) {
  try {
    const { seller } = await requireSeller(request);
    const body = await request.json() as {
      listingId?: string;
      quantity?: number;
      unitPriceCents?: number;
      buyerName?: string;
      buyerContact?: string;
      note?: string;
    };

    const listingId = body.listingId?.trim();
    const quantity = Math.max(1, Math.floor(Number(body.quantity ?? 1)));
    const unitPriceCents = Math.max(0, Math.round(Number(body.unitPriceCents ?? 0)));

    if (!listingId) return jsonResponse({ error: "Listing is required." }, 400);
    if (unitPriceCents <= 0) return jsonResponse({ error: "Cash sale amount must be greater than $0." }, 400);

    const { data, error } = await getSupabaseAdmin().rpc("record_store_cash_sale", {
      p_listing_id: listingId,
      p_seller_id: seller.id,
      p_quantity: quantity,
      p_unit_price_cents: unitPriceCents,
      p_buyer_name: body.buyerName?.trim().slice(0, 160) || null,
      p_buyer_contact: body.buyerContact?.trim().slice(0, 240) || null,
      p_note: body.note?.trim().slice(0, 1000) || null,
    });

    if (error) throw new Error(error.message);
    return jsonResponse({ saleId: data });
  } catch (error) {
    const auth = marketplaceAuthError(error);
    if (auth) return jsonResponse({ error: auth.message }, auth.status);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to record cash sale." }, 500);
  }
}
