import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "./supabase.js";

export type RedeemedDownload = {
  orderId: string;
  productId: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function issueDownloadToken(args: {
  orderId: string;
  productId: string;
  authUserId: string;
  ttlSeconds: number;
}): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const ttl = Math.min(Math.max(args.ttlSeconds || 600, 60), 3600);
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const { error } = await getSupabaseAdmin()
    .from("store_download_tokens")
    .insert({
      token_hash: tokenHash,
      order_id: args.orderId,
      product_id: args.productId,
      auth_user_id: args.authUserId,
      expires_at: expiresAt,
    });

  if (error) throw new Error(`Unable to create download token: ${error.message}`);
  return token;
}

export async function redeemDownloadToken(token: string): Promise<RedeemedDownload> {
  const normalized = token.trim();
  if (!normalized) throw new Error("Download token is required.");

  const { data, error } = await getSupabaseAdmin().rpc(
    "redeem_store_download_token",
    { p_token_hash: hashToken(normalized) },
  );

  if (error) throw new Error(`Unable to redeem download token: ${error.message}`);

  const result = data as Record<string, unknown> | null;
  if (!result?.order_id || !result?.product_id) {
    throw new Error("This download link is invalid, expired, or has already been used.");
  }

  return {
    orderId: String(result.order_id),
    productId: String(result.product_id),
  };
}
