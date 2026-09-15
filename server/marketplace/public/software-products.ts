import { jsonResponse } from "../../lib/http.js";
import {
  getStoreSoftwareProduct,
  listStoreSoftwareProducts,
  type StoreSoftwareProduct,
} from "../../lib/storeProducts.js";

function featuresOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(String).map((item) => item.trim()).filter(Boolean)
    : [];
}

function publicProduct(product: StoreSoftwareProduct) {
  return {
    slug: product.slug,
    name: product.name,
    tagline: product.store_tagline ?? "",
    description: product.store_description ?? "",
    priceCents: product.store_price_cents ?? 0,
    currency: product.store_currency || "usd",
    version: product.current_version ?? "",
    platform: product.store_platform ?? "",
    softwareType: product.store_software_type ?? "windows",
    featured: product.store_featured,
    icon: product.store_icon_url ?? "",
    features: featuresOf(product.store_features),
  };
}

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("slug")?.trim().toLowerCase();

    if (slug) {
      const product = await getStoreSoftwareProduct(slug, true);
      return jsonResponse({ product: publicProduct(product) });
    }

    const products = await listStoreSoftwareProducts();
    return jsonResponse({ products: products.map(publicProduct) });
  } catch (error) {
    console.error("Software catalog load failed:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to load software catalog." },
      500,
    );
  }
}
