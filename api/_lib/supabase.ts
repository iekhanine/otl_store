import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import { requireEnv } from "./env.js";


/* ==========================================================
   SUPABASE DATABASE TYPES
   Minimal schema required by the Store API.
   ========================================================== */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];


export type StoreDatabase = {

  public: {

    Tables: Record<string, never>;

    Views: Record<string, never>;

    Functions: {

      fulfill_store_checkout: {

        Args: {

          p_checkout_session_id: string;

          p_payment_intent_id: string | null;

          p_stripe_customer_id: string | null;

          p_customer_email: string;

          p_customer_name: string;

          p_product_slug: string;

          p_amount_total: number;

          p_currency: string;

        };

        Returns: Json;

      };

    };

    Enums: Record<string, never>;

    CompositeTypes: Record<string, never>;

  };

};


let instance: SupabaseClient<StoreDatabase> | null = null;


export function getSupabaseAdmin(): SupabaseClient<StoreDatabase> {

  if (!instance) {

    instance = createClient<StoreDatabase>(

      requireEnv("SUPABASE_URL"),

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

  return instance;

}
