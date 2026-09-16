import { jsonResponse } from "../../server/lib/http.js";
import { getSupabaseAdmin } from "../../server/lib/supabase.js";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { licenseKey?: unknown };
    const licenseKey = typeof body.licenseKey === "string" ? body.licenseKey.trim() : "";

    if (!licenseKey || licenseKey.length > 160) {
      return jsonResponse({ valid: false, status: "invalid", error: "License key is required." }, 400);
    }

    const { data, error } = await getSupabaseAdmin()
      .from("licenses")
      .select("id, status, expires_at, product_id")
      .eq("license_key", licenseKey)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return jsonResponse({ valid: false, status: "invalid" }, 404);
    }

    const expired = data.expires_at
      ? new Date(data.expires_at).getTime() <= Date.now()
      : false;

    const status = expired ? "expired" : data.status;
    const valid = status === "active";

    return jsonResponse({
      valid,
      status,
      productId: data.product_id,
      checkedAt: new Date().toISOString(),
    }, valid ? 200 : 403);
  } catch (error) {
    console.error("License status check failed:", error);
    return jsonResponse({
      valid: false,
      status: "unknown",
      error: "Unable to validate license right now.",
    }, 503);
  }
}
