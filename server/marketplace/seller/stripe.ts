import { storePublicUrl } from "../../lib/env.js";
import { jsonResponse } from "../../lib/http.js";
import { marketplaceAuthError, requireSeller } from "../../lib/marketplace.js";
import { getStripe } from "../../lib/stripe.js";
import { getSupabaseAdmin } from "../../lib/supabase.js";

/* ==========================================================
   SELLER STRIPE 001
   Stripe Connect onboarding / management

   Owner/admin seller identities use the OneTime Labs platform
   Stripe account directly. Every other approved seller receives
   their own connected account and uses Stripe-hosted onboarding.
   ========================================================== */

type StripeAction = "connect" | "manage" | "status";

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
        onboardingComplete: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        platformAccount: true,
        message: "This seller uses the OneTime Labs Stripe account.",
      });
    }

    const body = await request.json().catch(() => ({})) as { action?: unknown };
    const action: StripeAction =
      body.action === "manage"
        ? "manage"
        : body.action === "status"
          ? "status"
          : "connect";

    const stripe = getStripe();
    let accountId = seller.stripe_account_id;

    if (!accountId) {
      /*
       * Marketplace recipient account:
       * - OneTime Labs owns fees and payment losses.
       * - Seller gets the Express Dashboard.
       * - Seller only needs Transfers because checkout uses
       *   destination charges on the OneTime Labs platform account.
       * - Do NOT request card_payments on the connected account.
       */
      const account = await stripe.accounts.create({
        email: seller.email,
        controller: {
          fees: { payer: "application" },
          losses: { payments: "application" },
          stripe_dashboard: { type: "express" },
        },
        capabilities: {
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

    if (action === "status") {
      return jsonResponse({
        connected: onboardingComplete,
        onboardingComplete,
        chargesEnabled,
        payoutsEnabled,
        platformAccount: false,
        accountId,
      });
    }

    if (action === "manage" && onboardingComplete) {
      const loginLink = await stripe.accounts.createLoginLink(accountId);
      return jsonResponse({
        connected: true,
        onboardingComplete,
        chargesEnabled,
        payoutsEnabled,
        platformAccount: false,
        accountId,
        url: loginLink.url,
      });
    }

    /*
     * Account Links are deliberately created on demand. They expire
     * and are single-use, so never store or hard-code an onboarding URL.
     */
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
      onboardingComplete,
      chargesEnabled,
      payoutsEnabled,
      platformAccount: false,
      accountId,
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
