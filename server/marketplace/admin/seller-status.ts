import { jsonResponse } from "../../lib/http.js";
import { marketplaceAuthError, requireMarketplaceAdmin } from "../../lib/marketplace.js";
import { getSupabaseAdmin } from "../../lib/supabase.js";

export async function POST(request: Request) {
  try {
    await requireMarketplaceAdmin(request);
    const body = await request.json() as { sellerId?: string; status?: string };
    const sellerId = body.sellerId?.trim();
    const status = body.status?.trim();

    if (!sellerId || !status || !["pending", "approved", "suspended"].includes(status)) {
      return jsonResponse({ error: "Valid seller and status are required." }, 400);
    }

    const { data, error } = await getSupabaseAdmin()
      .from("store_sellers")
      .update({ status })
      .eq("id", sellerId)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return jsonResponse({ error: "Seller not found." }, 404);
    return jsonResponse({ seller: data });
  } catch (error) {
    const auth = marketplaceAuthError(error);
    if (auth) return jsonResponse({ error: auth.message }, auth.status);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to update seller." }, 500);
  }
}
