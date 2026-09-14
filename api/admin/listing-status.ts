import { jsonResponse } from "../_lib/http.js";
import { marketplaceAuthError, requireMarketplaceAdmin } from "../_lib/marketplace.js";
import { getSupabaseAdmin } from "../_lib/supabase.js";

export async function POST(request: Request) {
  try {
    await requireMarketplaceAdmin(request);
    const body = await request.json() as { listingId?: string; status?: string };
    const listingId = body.listingId?.trim();
    const status = body.status?.trim();

    if (!listingId || !status || !["draft", "published", "sold_out", "archived"].includes(status)) {
      return jsonResponse({ error: "Valid listing and status are required." }, 400);
    }

    const { data, error } = await getSupabaseAdmin()
      .from("store_listings")
      .update({ status })
      .eq("id", listingId)
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
