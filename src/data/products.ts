export type SoftwareType =
  | "windows"
  | "web"
  | "macos"
  | "linux";

export type StoreProduct = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: string;
  version: string;
  platform: string;
  softwareType: SoftwareType;
  featured?: boolean;
  icon: string;
  features: string[];
};

/* ==========================================================
   HEADER 001
   Software platform labels

   Change softwareType on a product to move it between the
   Windows / Web Apps / macOS / Linux catalog filters.
   ========================================================== */

export const softwareTypeLabels: Record<SoftwareType, string> = {
  windows: "Windows App",
  web: "Web App",
  macos: "macOS App",
  linux: "Linux App",
};

/* ==========================================================
   HEADER 002
   StreamSafe storefront copy
   ========================================================== */

export const streamSafe: StoreProduct = {
  slug: "streamsafe",
  name: "StreamSafe",
  tagline: "A panic button for your Twitch stream.",
  description:
    "StreamSafe gives your live stream a short safety delay before it reaches Twitch. If something happens that you do not want viewers to see or hear, hit DUMP and StreamSafe removes that moment from the buffer before it is sent to your audience.",
  price: "$49.00",
  version: "0.12.2",
  platform: "Windows 10 / 11",
  softwareType: "windows",
  featured: true,
  icon: "/images/streamsafe.png",
  features: [
    "Choose a 5, 10, or 15 second safety window",
    "DUMP a mistake before Twitch viewers see it",
    "Keep an emergency button floating on top of your screen",
    "Test your setup without making your channel publicly live",
    "Works with OBS and Twitch",
    "Future StreamSafe updates included",
  ],
};

export const products = [streamSafe];

export function softwareProductPath(product: Pick<StoreProduct, "slug">): string {
  return product.slug === "streamsafe"
    ? "/streamsafe"
    : `/software/${encodeURIComponent(product.slug)}`;
}
