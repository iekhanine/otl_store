import { jsonResponse } from "../server/lib/http.js";
import { getStoreSoftwareProduct } from "../server/lib/storeProducts.js";

export async function GET(_request: Request) {
  try {
    const product = await getStoreSoftwareProduct("streamsafe", false);

    return jsonResponse({
      product: product.slug,
      version: product.current_version ?? "",
      storeUrl: "https://store.onetimelabs.net/streamsafe",
      updatesIncluded: true,
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to load release information." },
      500,
    );
  }
}
