import { jsonResponse } from "./_lib/http.js";

export async function GET(request: Request) {

  return jsonResponse({
    product: "streamsafe",
    version: process.env.STREAMSAFE_CURRENT_VERSION?.trim() || "0.12.1",
    storeUrl: "https://store.onetimelabs.net/streamsafe",
    updatesIncluded: true,
  });
}
