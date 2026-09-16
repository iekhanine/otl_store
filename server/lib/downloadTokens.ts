import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "./supabase.js";

export type RedeemedDownload = {
  productId: string;
  licenseId: string | null;
  entitlementId: string | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function issueEntitlementDownloadToken(args: {
  productId: string;
  entitlementId: string;
  licenseId: string;
  recipientEmail?: string | null;
  ttlSeconds: number;
  maxUses?: number | null;
  source?: "account" | "purchase" | "admin_recovery";
}): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const ttl = Math.min(Math.max(args.ttlSeconds || 600, 60), 604800);
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const { error } = await getSupabaseAdmin()
    .from("store_download_links")
    .insert({
      token_hash: tokenHash,
      product_id: args.productId,
      entitlement_id: args.entitlementId,
      license_id: args.licenseId,
      source: args.source ?? "account",
      max_uses: args.maxUses === undefined ? 1 : args.maxUses,
      expires_at: expiresAt,
      recipient_email: args.recipientEmail ?? null,
    });

  if (error) {
    throw new Error(`Unable to create download token: ${error.message}`);
  }

  return token;
}

export async function redeemDownloadToken(token: string): Promise<RedeemedDownload> {
  const normalized = token.trim();
  if (!normalized) throw new Error("Download token is required.");

  const { data, error } = await getSupabaseAdmin().rpc(
    "redeem_store_download_link",
    { p_token_hash: hashToken(normalized) },
  );

  if (error) {
    throw new Error(`Unable to redeem download token: ${error.message}`);
  }

  const result = data as Record<string, unknown> | null;
  if (!result?.product_id) {
    throw new Error("This download link is invalid, expired, exhausted, or has been revoked.");
  }

  return {
    productId: String(result.product_id),
    licenseId: result.license_id ? String(result.license_id) : null,
    entitlementId: result.entitlement_id ? String(result.entitlement_id) : null,
  };
}
