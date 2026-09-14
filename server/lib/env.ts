export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export function storePublicUrl(): string {
  return (
    process.env.STORE_PUBLIC_URL?.trim() ||
    "https://store.onetimelabs.net"
  ).replace(/\/$/, "");
}
