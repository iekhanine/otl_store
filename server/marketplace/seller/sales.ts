import { jsonResponse } from "../../lib/http.js";
import { marketplaceAuthError, requireSeller } from "../../lib/marketplace.js";
import { getSupabaseAdmin } from "../../lib/supabase.js";

/* ==========================================================
   SELLER SALES 001
   Active + archived sales history
   ========================================================== */

export async function GET(request: Request) {
  try {
    const { seller } = await requireSeller(request);
    const url = new URL(request.url);
    const archived = url.searchParams.get("archived") === "1";

    let query = getSupabaseAdmin()
      .from("store_sales")
      .select(`
        id,
        listing_id,
        channel,
        quantity,
        unit_price_cents,
        subtotal_cents,
        processor_fee_cents,
        platform_fee_cents,
        buyer_name,
        buyer_contact,
        cash_note,
        payment_status,
        fulfillment_status,
        sold_at,
        created_at,
        archived_at,
        store_listings ( title, slug )
      `)
      .eq("seller_id", seller.id)
      .order("sold_at", { ascending: false })
      .limit(250);

    query = archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null);

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return jsonResponse({ sales: data ?? [] });
  } catch (error) {
    const auth = marketplaceAuthError(error);
    if (auth) return jsonResponse({ error: auth.message }, auth.status);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to load sales." }, 500);
  }
}

/* ==========================================================
   SELLER SALES 002
   Archive a sale from the seller's working history.
   The ledger row remains intact for audit/history.
   ========================================================== */

export async function PATCH(request: Request) {
  try {
    const { seller } = await requireSeller(request);
    const body = await request.json() as { saleId?: unknown };
    const saleId = typeof body.saleId === "string" ? body.saleId.trim() : "";

    if (!saleId) {
      return jsonResponse({ error: "Sale ID is required." }, 400);
    }

    const { data, error } = await getSupabaseAdmin()
      .from("store_sales")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", saleId)
      .eq("seller_id", seller.id)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return jsonResponse({ error: "Sale not found." }, 404);

    return jsonResponse({ archived: true });
  } catch (error) {
    const auth = marketplaceAuthError(error);
    if (auth) return jsonResponse({ error: auth.message }, auth.status);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to archive sale." }, 500);
  }
}
