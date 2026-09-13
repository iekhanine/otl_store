export type StoreProduct = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: string;
  version: string;
  platform: string;
  icon: string;
  features: string[];
};

export const streamSafe: StoreProduct = {
  slug: "streamsafe",
  name: "StreamSafe",
  tagline: "Pre-air protection for live broadcasters.",
  description:
    "Keep mistakes, private information, and unwanted content from reaching your live audience with a configurable local recall window and instant DUMP control.",
  price: import.meta.env.VITE_STREAMSAFE_DISPLAY_PRICE?.trim() || "$49.00",
  version: "0.12.1",
  platform: "Windows 10 / 11",
  icon: "/images/streamsafe.png",
  features: [
    "Local pre-air protection",
    "Configurable recall window",
    "Instant DUMP control",
    "Floating always-on-top control",
    "Twitch support",
    "Lifetime StreamSafe updates",
  ],
};

export const products = [streamSafe];
