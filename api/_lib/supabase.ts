import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env.js";

let adminInstance: SupabaseClient | null = null;
let authInstance: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  return requireEnv("SUPABASE_URL");
}

function getSupabasePublishableKey(): string {
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!key) {
    throw new Error(
      "SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY is not configured.",
    );
  }

  return key;
}

export function getSupabaseAuthClient(): SupabaseClient {
  if (!authInstance) {
    authInstance = createClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  return authInstance;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminInstance) {
    adminInstance = createClient(
      getSupabaseUrl(),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  return adminInstance;
}
