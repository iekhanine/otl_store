import Stripe from "stripe";
import { requireEnv } from "./env.js";

let instance: Stripe | null = null;

export function getStripe() {
  if (!instance) {
    instance = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  }
  return instance;
}
