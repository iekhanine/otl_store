import { storePublicUrl } from "../../lib/env.js";
import { jsonResponse } from "../../lib/http.js";
import { marketplaceAuthError, requireSeller } from "../../lib/marketplace.js";
import { getStripe } from "../../lib/stripe.js";
import { getSupabaseAdmin } from "../../lib/supabase.js";

/* ==========================================================
   SELLER STRIPE 001
   Stripe Connect onboarding / management

   OneTime Labs owner sellers use the platform Stripe account
   directly and never receive a Stripe connected-account ID.
   Every other approved seller gets an Express connected account.
   ========================================================== */

export async function POST(request: Request) {
  try {
    const { seller } = await requireSeller(request);

    if (seller.status !== "approved") {
      return jsonResponse(
        { error: "Seller approval is required before connecting Stripe." },
        403,
      );
    }

    if (seller.uses_platform_stripe) {
      return jsonResponse({
        connected: true,
        platformAccount: true,
        message: "This seller uses the OneTime Labs Stripe account.",
      });
    }

    const body = await request.json().catch(() => ({})) as { action?: unknown };
    const action = body.action === "manage" ? "manage" : "connect";
    const stripe = getStripe();
    let accountId = seller.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: seller.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          onetimelabs_seller_id: seller.id,
          onetimelabs_auth_user_id: seller.auth_user_id,
        },
      });

      accountId = account.id;

      const { error } = await getSupabaseAdmin()
        .from("store_sellers")
        .update({ stripe_account_id: accountId })
        .eq("id", seller.id);

      if (error) {
        throw new Error(`Unable to save Stripe connected account: ${error.message}`);
      }
    }

    const account = await stripe.accounts.retrieve(accountId);

    const onboardingComplete = Boolean(account.details_submitted);
    const chargesEnabled = Boolean(account.charges_enabled);
    const payoutsEnabled = Boolean(account.payouts_enabled);

    const { error: statusError } = await getSupabaseAdmin()
      .from("store_sellers")
      .update({
        stripe_onboarding_complete: onboardingComplete,
        stripe_charges_enabled: chargesEnabled,
        stripe_payouts_enabled: payoutsEnabled,
      })
      .eq("id", seller.id);

    if (statusError) {
      throw new Error(`Unable to update Stripe seller status: ${statusError.message}`);
    }

    if (action === "manage" && onboardingComplete) {
      const loginLink = await stripe.accounts.createLoginLink(accountId);
      return jsonResponse({
        connected: true,
        platformAccount: false,
        url: loginLink.url,
      });
    }

    const storeUrl = storePublicUrl(request);
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${storeUrl}/seller?stripe=refresh`,
      return_url: `${storeUrl}/seller?stripe=return`,
      type: "account_onboarding",
      collection_options: {
        fields: "eventually_due",
      },
    });

    return jsonResponse({
      connected: onboardingComplete,
      platformAccount: false,
      url: accountLink.url,
    });
  } catch (error) {
    const auth = marketplaceAuthError(error);
    if (auth) return jsonResponse({ error: auth.message }, auth.status);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to connect Stripe.",
      },
      500,
    );
  }
}
