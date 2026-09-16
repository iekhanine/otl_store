import type { User } from "@supabase/supabase-js";
import { requireStoreUser } from "./auth.js";
import { getSupabaseAdmin } from "./supabase.js";

export type SellerRecord = {
  id: string;
  auth_user_id: string;
  email: string;
  display_name: string;
  slug: string;
  status: "pending" | "approved" | "suspended";
  uses_platform_stripe: boolean;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export function slugifyStoreValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export async function getSellerForUser(user: User): Promise<SellerRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("store_sellers")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(`Unable to load seller profile: ${error.message}`);
  return (data as SellerRecord | null) ?? null;
}

export async function requireSeller(request: Request): Promise<{ user: User; seller: SellerRecord }> {
  const user = await requireStoreUser(request);
  const seller = await getSellerForUser(user);
  if (!seller) throw new Error("SELLER_REQUIRED");
  if (seller.status === "suspended") throw new Error("SELLER_SUSPENDED");
  return { user, seller };
}

export async function requireMarketplaceAdmin(request: Request): Promise<User> {
  const user = await requireStoreUser(request);
  const email = user.email?.trim().toLowerCase() ?? "";

  const configuredAdmins = (process.env.STORE_ADMIN_EMAILS ?? "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  if (configuredAdmins.includes(email)) return user;

  const { data, error } = await getSupabaseAdmin()
    .from("store_admins")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(`Unable to verify Store administrator: ${error.message}`);
  if (!data) throw new Error("ADMIN_REQUIRED");
  return user;
}

export function marketplaceAuthError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "SELLER_REQUIRED") return { status: 403, message: "Create a seller profile to continue." };
  if (error.message === "SELLER_SUSPENDED") return { status: 403, message: "This seller account is suspended." };
  if (error.message === "ADMIN_REQUIRED") return { status: 403, message: "Store administrator access is required." };
  return null;
}
