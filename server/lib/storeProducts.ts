import type Stripe from "stripe";
import { getStripe, getStripeMode } from "./stripe.js";
import { getSupabaseAdmin } from "./supabase.js";

export type StoreSoftwareProduct = {
  id: string;
  slug: string;
  name: string;
  current_version: string | null;
  store_enabled: boolean;
  store_tagline: string | null;
  store_description: string | null;
  store_price_cents: number | null;
  store_currency: string;
  store_platform: string | null;
  store_software_type: string | null;
  store_featured: boolean;
  store_icon_url: string | null;
  store_features: unknown;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  stripe_test_product_id: string | null;
  stripe_test_price_id: string | null;
  download_provider: string | null;
  download_bucket: string | null;
  download_object_key: string | null;
  download_filename: string | null;
  download_token_ttl_seconds: number;
  download_url_ttl_seconds: number;
};

const STORE_PRODUCT_COLUMNS = [
  "id",
  "slug",
  "name",
  "current_version",
  "store_enabled",
  "store_tagline",
  "store_description",
  "store_price_cents",
  "store_currency",
  "store_platform",
  "store_software_type",
  "store_featured",
  "store_icon_url",
  "store_features",
  "stripe_product_id",
  "stripe_price_id",
  "stripe_test_product_id",
  "stripe_test_price_id",
  "download_provider",
  "download_bucket",
  "download_object_key",
  "download_filename",
  "download_token_ttl_seconds",
  "download_url_ttl_seconds",
].join(",");

export async function getStoreSoftwareProduct(
  slug: string,
  requireEnabled = true,
): Promise<StoreSoftwareProduct> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) throw new Error("Product slug is required.");

  let query = getSupabaseAdmin()
    .from("products")
    .select(STORE_PRODUCT_COLUMNS)
    .eq("slug", normalizedSlug);

  if (requireEnabled) query = query.eq("store_enabled", true);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Unable to load Store product: ${error.message}`);
  if (!data) throw new Error("Store product was not found or is not available for sale.");

  return data as unknown as StoreSoftwareProduct;
}


export async function getStoreSoftwareProductById(
  id: string,
): Promise<StoreSoftwareProduct> {
  const normalizedId = id.trim();
  if (!normalizedId) throw new Error("Product ID is required.");

  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .select(STORE_PRODUCT_COLUMNS)
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load Store product: ${error.message}`);
  if (!data) throw new Error("Store product was not found.");

  return data as unknown as StoreSoftwareProduct;
}

export async function listStoreSoftwareProducts(): Promise<StoreSoftwareProduct[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .select(STORE_PRODUCT_COLUMNS)
    .eq("store_enabled", true)
    .order("store_featured", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw new Error(`Unable to load Store software: ${error.message}`);
  return (data ?? []) as unknown as StoreSoftwareProduct[];
}

function idOfPrice(
  price: string | Stripe.Price | null | undefined,
): string | null {
  if (!price) return null;
  return typeof price === "string" ? price : price.id;
}

export async function resolveStripePriceId(
  product: StoreSoftwareProduct,
): Promise<string> {
  const stripe = getStripe();
  const mode = getStripeMode();
  const configuredPriceId =
    mode === "test" ? product.stripe_test_price_id : product.stripe_price_id;
  const configuredProductId =
    mode === "test" ? product.stripe_test_product_id : product.stripe_product_id;

  if (configuredPriceId) {
    const price = await stripe.prices.retrieve(configuredPriceId);
    if (!price.active) throw new Error(`The Stripe ${mode} price for this product is inactive.`);

    const stripeProductId =
      typeof price.product === "string" ? price.product : price.product.id;

    if (configuredProductId && stripeProductId !== configuredProductId) {
      throw new Error(`The configured Stripe ${mode} price belongs to a different product.`);
    }

    return price.id;
  }

  if (!configuredProductId) {
    throw new Error(`This product does not have a Stripe ${mode} product configured.`);
  }

  const stripeProduct = await stripe.products.retrieve(configuredProductId, {
    expand: ["default_price"],
  });

  const defaultPriceId = idOfPrice(stripeProduct.default_price);
  if (!defaultPriceId) {
    throw new Error(`This Stripe ${mode} product does not have a default price.`);
  }

  return defaultPriceId;
}
