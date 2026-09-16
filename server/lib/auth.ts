import type { User } from "@supabase/supabase-js";
import { getSupabaseAuthClient } from "./supabase.js";

export async function requireStoreUser(request: Request): Promise<User> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new Error("AUTH_REQUIRED");
  }

  const { data, error } = await getSupabaseAuthClient().auth.getUser(match[1]);

  if (error) {
    console.error("STORE AUTH VALIDATION ERROR:", {
      message: error.message,
      status: error.status,
      code: error.code,
      name: error.name,
    });
  }

  if (error || !data.user) {
    throw new Error("AUTH_REQUIRED");
  }

  if (!data.user.email) {
    throw new Error("ACCOUNT_EMAIL_REQUIRED");
  }

  return data.user;
}

export function isAuthError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === "AUTH_REQUIRED" ||
      error.message === "ACCOUNT_EMAIL_REQUIRED")
  );
}
