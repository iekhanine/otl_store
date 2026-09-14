import { jsonResponse } from "../_lib/http.js";
import { marketplaceAuthError, requireMarketplaceAdmin } from "../_lib/marketplace.js";
import { getSupabaseAdmin } from "../_lib/supabase.js";

export async function GET(request: Request) {
  try {
    await requireMarketplaceAdmin(request);
    const supabase = getSupabaseAdmin();

    const [sellersResult, listingsResult, salesResult] = await Promise.all([
      supabase.from("store_sellers").select("*").order("created_at", { ascending: false }),
      supabase.from("store_listings").select("*, store_sellers(display_name,email,status)").order("created_at", { ascending: false }).limit(200),
      supabase.from("store_sales").select("*, store_sellers(display_name), store_listings(title)").order("sold_at", { ascending: false }).limit(100),
    ]);

    if (sellersResult.error) throw new Error(sellersResult.error.message);
    if (listingsResult.error) throw new Error(listingsResult.error.message);
    if (salesResult.error) throw new Error(salesResult.error.message);

    return jsonResponse({
      sellers: sellersResult.data ?? [],
      listings: listingsResult.data ?? [],
      sales: salesResult.data ?? [],
    });
  } catch (error) {
    const auth = marketplaceAuthError(error);
    if (auth) return jsonResponse({ error: auth.message }, auth.status);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to load marketplace admin." }, 500);
  }
}
