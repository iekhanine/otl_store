import { createHmac, createHash } from "node:crypto";
import { requireEnv } from "./env.js";
import { getSupabaseAdmin } from "./supabase.js";
import type { StoreSoftwareProduct } from "./storeProducts.js";

function cleanFilename(filename: string): string {
  return filename.replace(/[\r\n"\\]/g, "_").slice(0, 180) || "download.bin";
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodeObjectPath(value: string): string {
  return value
    .split("/")
    .map((segment) => encodeRfc3986(segment))
    .join("/");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isoAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function createR2PresignedGetUrl(args: {
  bucket: string;
  objectKey: string;
  expiresIn: number;
}): string {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const host = `${args.bucket}.${accountId}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";
  const now = new Date();
  const { amzDate, dateStamp } = isoAmzDate(now);
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalUri = `/${encodeObjectPath(args.objectKey)}`;

  const params: Array<[string, string]> = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Content-Sha256", "UNSIGNED-PAYLOAD"],
    ["X-Amz-Credential", `${accessKeyId}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(args.expiresIn)],
    ["X-Amz-SignedHeaders", "host"],
  ];

  const canonicalQuery = params
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)] as const)
    .sort(([aKey, aValue], [bKey, bValue]) =>
      aKey < bKey ? -1 : aKey > bKey ? 1 : aValue < bValue ? -1 : aValue > bValue ? 1 : 0,
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export async function createPrivateSoftwareUrl(
  product: StoreSoftwareProduct,
): Promise<string> {
  const provider = product.download_provider?.trim().toLowerCase();
  const bucket = product.download_bucket?.trim();
  const objectKey = product.download_object_key?.trim();
  const filename = cleanFilename(product.download_filename?.trim() || `${product.slug}.bin`);
  const ttl = Math.min(Math.max(product.download_url_ttl_seconds || 60, 15), 300);

  if (!provider || !bucket || !objectKey) {
    throw new Error("This product does not have a download artifact configured.");
  }

  if (provider === "r2") {
    return createR2PresignedGetUrl({
      bucket,
      objectKey,
      expiresIn: ttl,
    });
  }

  if (provider === "supabase") {
    const signed = await getSupabaseAdmin()
      .storage
      .from(bucket)
      .createSignedUrl(objectKey, ttl, { download: filename });

    if (signed.error || !signed.data?.signedUrl) {
      throw new Error(signed.error?.message || "Unable to create private download link.");
    }

    return signed.data.signedUrl;
  }

  throw new Error(`Unsupported download provider: ${provider}`);
}
