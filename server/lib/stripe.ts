import Stripe from "stripe";
import { requireEnv } from "./env.js";

export type StripeMode = "live" | "test";

let instance: Stripe | null = null;

export function getStripeMode(): StripeMode {
  const mode = (process.env.STRIPE_MODE ?? "live").trim().toLowerCase();
  if (mode !== "live" && mode !== "test") {
    throw new Error('STRIPE_MODE must be either "live" or "test".');
  }
  return mode;
}

export function assertStripeMode(): StripeMode {
  const mode = getStripeMode();
  const key = requireEnv("STRIPE_SECRET_KEY");
  const liveKey = key.startsWith("sk_live_") || key.startsWith("rk_live_");
  const testKey = key.startsWith("sk_test_") || key.startsWith("rk_test_");

  if (mode === "live" && !liveKey) {
    throw new Error(
      "STRIPE_MODE is live, but STRIPE_SECRET_KEY is not a live Stripe key.",
    );
  }

  if (mode === "test" && !testKey) {
    throw new Error(
      "STRIPE_MODE is test, but STRIPE_SECRET_KEY is not a test Stripe key.",
    );
  }

  return mode;
}

export function getStripe() {
  if (!instance) {
    assertStripeMode();
    instance = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  }
  return instance;
}
