-- ============================================================
-- ONETIME LABS STORE - ACCOUNT OWNERSHIP + PRIVATE DOWNLOADS
-- Run AFTER 001_store_stripe_licensing.sql in the Licensing DB.
-- ============================================================

ALTER TABLE public.store_orders
ADD COLUMN IF NOT EXISTS auth_user_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_store_orders_auth_user_id
ON public.store_orders(auth_user_id);

-- Replace fulfillment RPC with account-aware signature.
DROP FUNCTION IF EXISTS public.fulfill_store_checkout(
    text, text, text, text, text, text, bigint, text, uuid
);

CREATE OR REPLACE FUNCTION public.fulfill_store_checkout(
    p_checkout_session_id text,
    p_payment_intent_id text,
    p_stripe_customer_id text,
    p_customer_email text,
    p_customer_name text,
    p_product_slug text,
    p_amount_total bigint,
    p_currency text,
    p_auth_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_order public.store_orders%ROWTYPE;
    v_product public.products%ROWTYPE;
    v_customer public.customers%ROWTYPE;
    v_license public.licenses%ROWTYPE;
    v_license_key text;
    v_prefix text;
    v_random text;
BEGIN
    IF NULLIF(TRIM(p_checkout_session_id), '') IS NULL THEN RAISE EXCEPTION 'Checkout Session ID is required.'; END IF;
    IF NULLIF(TRIM(p_customer_email), '') IS NULL THEN RAISE EXCEPTION 'Customer email is required.'; END IF;

    PERFORM pg_advisory_xact_lock(hashtext(p_checkout_session_id));

    SELECT * INTO v_existing_order FROM public.store_orders WHERE checkout_session_id = p_checkout_session_id LIMIT 1;
    IF v_existing_order.id IS NOT NULL THEN
        IF v_existing_order.auth_user_id IS NULL AND p_auth_user_id IS NOT NULL THEN
            UPDATE public.store_orders SET auth_user_id = p_auth_user_id WHERE id = v_existing_order.id RETURNING * INTO v_existing_order;
        END IF;
        SELECT * INTO v_license FROM public.licenses WHERE id = v_existing_order.license_id;
        SELECT * INTO v_product FROM public.products WHERE id = v_existing_order.product_id;
        RETURN jsonb_build_object(
            'order_id', v_existing_order.id, 'customer_id', v_existing_order.customer_id,
            'license_id', v_existing_order.license_id, 'license_key', v_license.license_key,
            'customer_email', v_existing_order.customer_email, 'product_slug', v_product.slug,
            'product_name', v_product.name, 'status', v_existing_order.status
        );
    END IF;

    SELECT * INTO v_product FROM public.products WHERE LOWER(slug) = LOWER(p_product_slug) LIMIT 1;
    IF v_product.id IS NULL THEN RAISE EXCEPTION 'Store product % is not registered.', p_product_slug; END IF;

    SELECT * INTO v_customer FROM public.customers
    WHERE LOWER(email) = LOWER(TRIM(p_customer_email)) AND is_archived = false
    ORDER BY created_at LIMIT 1;

    IF v_customer.id IS NULL THEN
        INSERT INTO public.customers (company_name, contact_name, email, active, notes)
        VALUES (COALESCE(NULLIF(TRIM(p_customer_name), ''), TRIM(p_customer_email)), NULLIF(TRIM(p_customer_name), ''), LOWER(TRIM(p_customer_email)), true, 'Created automatically by store.onetimelabs.net.')
        RETURNING * INTO v_customer;
    END IF;

    v_prefix := COALESCE(NULLIF(TRIM(v_product.license_prefix), ''), 'OTL');
    LOOP
        v_random := UPPER(REPLACE(gen_random_uuid()::text, '-', ''));
        v_license_key := 'OTL-' || v_prefix || '-' || SUBSTRING(v_random, 1, 4) || '-' || SUBSTRING(v_random, 5, 4) || '-' || SUBSTRING(v_random, 9, 4) || '-' || SUBSTRING(v_random, 13, 4);
        BEGIN
            INSERT INTO public.licenses (customer_id, product_id, license_key, customer_name, customer_email, status, notes, expires_at, max_activations, activated_count)
            VALUES (v_customer.id, v_product.id, v_license_key, v_customer.company_name, LOWER(TRIM(p_customer_email)), 'active', 'Perpetual license issued by OneTime Labs Store via Stripe.', NULL, 1, 0)
            RETURNING * INTO v_license;
            EXIT;
        EXCEPTION WHEN unique_violation THEN
        END;
    END LOOP;

    INSERT INTO public.store_orders (checkout_session_id, payment_intent_id, stripe_customer_id, customer_id, product_id, license_id, customer_email, amount_total, currency, status, auth_user_id)
    VALUES (p_checkout_session_id, p_payment_intent_id, p_stripe_customer_id, v_customer.id, v_product.id, v_license.id, LOWER(TRIM(p_customer_email)), COALESCE(p_amount_total, 0), COALESCE(NULLIF(TRIM(p_currency), ''), 'usd'), 'fulfilled', p_auth_user_id)
    RETURNING * INTO v_existing_order;

    RETURN jsonb_build_object(
        'order_id', v_existing_order.id, 'customer_id', v_customer.id,
        'license_id', v_license.id, 'license_key', v_license.license_key,
        'customer_email', LOWER(TRIM(p_customer_email)), 'product_slug', v_product.slug,
        'product_name', v_product.name, 'status', v_existing_order.status
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_store_checkout(text, text, text, text, text, text, bigint, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_store_checkout(text, text, text, text, text, text, bigint, text, uuid) TO service_role;

-- Private storage bucket. Safe to re-run.
INSERT INTO storage.buckets (id, name, public)
VALUES ('software-releases', 'software-releases', false)
ON CONFLICT (id) DO UPDATE SET public = false;
