export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function allowedStoreHost(host: string): boolean {
  const hostname = host.split(":")[0]?.trim().toLowerCase() ?? "";
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".vercel.app") ||
    hostname === "onetimelabs.net" ||
    hostname.endsWith(".onetimelabs.net")
  );
}

export function storePublicUrl(request?: Request): string {
  // Browser-initiated flows must return to the same origin that started
  // them. This preserves Supabase localStorage sessions across Stripe
  // redirects and keeps Preview isolated from Production.
  if (request) {
    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim();
    const forwardedProto = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();

    if (forwardedHost && allowedStoreHost(forwardedHost)) {
      const protocol = forwardedProto === "http" ? "http" : "https";
      return `${protocol}://${forwardedHost}`.replace(/\/$/, "");
    }

    try {
      const requestUrl = new URL(request.url);
      if (allowedStoreHost(requestUrl.host)) {
        return requestUrl.origin.replace(/\/$/, "");
      }
    } catch {
      // Fall through to configured deployment values.
    }
  }

  const configured = process.env.STORE_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/$/, "");

  return "http://localhost:3000";
}
