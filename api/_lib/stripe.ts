import Stripe from "stripe";
import { requireEnv } from "./env.js";

let instance: Stripe | null = null;

export function assertStripeMode() {
  const key = requireEnv("STRIPE_SECRET_KEY");
  const requireLive = (process.env.STRIPE_REQUIRE_LIVE_MODE ?? "true").trim().toLowerCase() !== "false";
  const liveKey = key.startsWith("sk_live_") || key.startsWith("rk_live_");

  if (requireLive && !liveKey) {
    throw new Error(
      "Production checkout is still configured with a Stripe test/sandbox key. Set STRIPE_SECRET_KEY to a live key before accepting payments.",
    );
  }
}

export function getStripe() {
  if (!instance) {
    assertStripeMode();
    instance = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  }
  return instance;
}
