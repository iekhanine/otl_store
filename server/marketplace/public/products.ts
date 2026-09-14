import { getSupabaseAdmin } from "../../lib/supabase.js";
import { jsonResponse } from "../../lib/http.js";

/* ==========================================================
   MARKETPLACE PRODUCTS 001
   Public hardware catalog
   ========================================================== */

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug")?.trim();
    const limitValue = Number(url.searchParams.get("limit") ?? "48");
    const limit = Number.isFinite(limitValue)
      ? Math.min(Math.max(limitValue, 1), 100)
      : 48;

    let query = getSupabaseAdmin()
      .from("store_listings")
      .select(`
        id,
        seller_id,
        slug,
        title,
        description,
        category,
        subcategory,
        condition,
        brand,
        model,
        sku,
        price_cents,
        shipping_price_cents,
        currency,
        quantity,
        status,
        image_urls,
        specs,
        shipping_available,
        local_pickup_available,
        cash_sale_allowed,
        created_at,
        updated_at,
        store_sellers!inner (
          display_name,
          slug,
          status
        )
      `)
      .eq("status", "published")
      .gt("quantity", 0)
      .eq("store_sellers.status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (slug) {
      query = query.eq("slug", slug).limit(1);
    }

    const { data, error } = await query;

    /* ========================================================
       MARKETPLACE PRODUCTS 002
       Graceful public empty state before marketplace setup
       ======================================================== */

    if (error) {
      const code = typeof error.code === "string" ? error.code : "";
      const message = error.message?.toLowerCase() ?? "";
      const marketplaceSchemaMissing =
        code === "PGRST205" ||
        code === "42P01" ||
        (message.includes("store_listings") &&
          (message.includes("schema cache") ||
            message.includes("does not exist")));

      // The public hardware page should look like an empty storefront while
      // the marketplace tables are being provisioned. Seller/admin APIs will
      // still surface schema/setup errors normally.
      if (!slug && marketplaceSchemaMissing) {
        return jsonResponse({ products: [], marketplaceReady: false });
      }

      throw new Error(error.message);
    }

    if (slug) {
      const product = data?.[0] ?? null;

      if (!product) {
        return jsonResponse({ error: "Product not found." }, 404);
      }

      return jsonResponse({ product });
    }

    return jsonResponse({ products: data ?? [], marketplaceReady: true });
  } catch (error) {
    console.error("Marketplace product load failed:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load hardware.",
      },
      500,
    );
  }
}
