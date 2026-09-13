-- ============================================================
-- ONETIME LABS STORE / STRIPE / LICENSING INTEGRATION
-- Run this in the EXISTING OneTime Labs Licensing Supabase DB.
-- Existing tables used:
--   customers, products, licenses, activations
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 001 - Register StreamSafe as a licensing product
-- ------------------------------------------------------------
INSERT INTO public.products (
    name,
    slug,
    current_version,
    license_prefix
)
VALUES (
    'StreamSafe',
    'streamsafe',
    '0.12.2',
    'SSAF'
)
ON CONFLICT (slug)
DO UPDATE SET
    name = EXCLUDED.name,
    current_version = EXCLUDED.current_version,
    license_prefix = EXCLUDED.license_prefix;

-- ------------------------------------------------------------
-- 002 - Store orders
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    checkout_session_id text NOT NULL UNIQUE,
    payment_intent_id text UNIQUE,
    stripe_customer_id text,
    customer_id uuid NOT NULL REFERENCES public.customers(id),
    product_id uuid NOT NULL REFERENCES public.products(id),
    license_id uuid NOT NULL UNIQUE REFERENCES public.licenses(id),
    customer_email text NOT NULL,
    amount_total bigint NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'usd',
    status text NOT NULL DEFAULT 'fulfilled',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies are intentionally created.
-- Store orders are accessed by the Vercel server using service_role.

-- ------------------------------------------------------------
-- 003 - Keep updated_at current
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_store_order_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_orders_set_updated_at
ON public.store_orders;

CREATE TRIGGER store_orders_set_updated_at
BEFORE UPDATE ON public.store_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_store_order_updated_at();

-- ------------------------------------------------------------
-- 004 - Idempotent Stripe fulfillment
--
-- pg_advisory_xact_lock prevents the Stripe webhook and the success
-- page from issuing two licenses for the same Checkout Session.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fulfill_store_checkout(
    p_checkout_session_id text,
    p_payment_intent_id text,
    p_stripe_customer_id text,
    p_customer_email text,
    p_customer_name text,
    p_product_slug text,
    p_amount_total bigint,
    p_currency text
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
    IF NULLIF(TRIM(p_checkout_session_id), '') IS NULL THEN
        RAISE EXCEPTION 'Checkout Session ID is required.';
    END IF;

    IF NULLIF(TRIM(p_customer_email), '') IS NULL THEN
        RAISE EXCEPTION 'Customer email is required.';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(p_checkout_session_id));

    SELECT *
    INTO v_existing_order
    FROM public.store_orders
    WHERE checkout_session_id = p_checkout_session_id
    LIMIT 1;

    IF v_existing_order.id IS NOT NULL THEN
        SELECT *
        INTO v_license
        FROM public.licenses
        WHERE id = v_existing_order.license_id;

        SELECT *
        INTO v_product
        FROM public.products
        WHERE id = v_existing_order.product_id;

        RETURN jsonb_build_object(
            'order_id', v_existing_order.id,
            'customer_id', v_existing_order.customer_id,
            'license_id', v_existing_order.license_id,
            'license_key', v_license.license_key,
            'customer_email', v_existing_order.customer_email,
            'product_slug', v_product.slug,
            'product_name', v_product.name,
            'status', v_existing_order.status
        );
    END IF;

    SELECT *
    INTO v_product
    FROM public.products
    WHERE LOWER(slug) = LOWER(p_product_slug)
    LIMIT 1;

    IF v_product.id IS NULL THEN
        RAISE EXCEPTION 'Store product % is not registered.', p_product_slug;
    END IF;

    SELECT *
    INTO v_customer
    FROM public.customers
    WHERE LOWER(email) = LOWER(TRIM(p_customer_email))
      AND is_archived = false
    ORDER BY created_at
    LIMIT 1;

    IF v_customer.id IS NULL THEN
        INSERT INTO public.customers (
            company_name,
            contact_name,
            email,
            active,
            notes
        )
        VALUES (
            COALESCE(
                NULLIF(TRIM(p_customer_name), ''),
                TRIM(p_customer_email)
            ),
            NULLIF(TRIM(p_customer_name), ''),
            LOWER(TRIM(p_customer_email)),
            true,
            'Created automatically by store.onetimelabs.net.'
        )
        RETURNING * INTO v_customer;
    END IF;

    v_prefix := COALESCE(NULLIF(TRIM(v_product.license_prefix), ''), 'OTL');

    LOOP
        v_random := UPPER(REPLACE(gen_random_uuid()::text, '-', ''));
        v_license_key :=
            'OTL-' || v_prefix || '-' ||
            SUBSTRING(v_random, 1, 4) || '-' ||
            SUBSTRING(v_random, 5, 4) || '-' ||
            SUBSTRING(v_random, 9, 4) || '-' ||
            SUBSTRING(v_random, 13, 4);

        BEGIN
            INSERT INTO public.licenses (
                customer_id,
                product_id,
                license_key,
                customer_name,
                customer_email,
                status,
                notes,
                expires_at,
                max_activations,
                activated_count
            )
            VALUES (
                v_customer.id,
                v_product.id,
                v_license_key,
                v_customer.company_name,
                LOWER(TRIM(p_customer_email)),
                'active',
                'Perpetual license issued by OneTime Labs Store via Stripe.',
                NULL,
                1,
                0
            )
            RETURNING * INTO v_license;

            EXIT;
        EXCEPTION
            WHEN unique_violation THEN
                -- Extremely unlikely key collision; generate another key.
        END;
    END LOOP;

    INSERT INTO public.store_orders (
        checkout_session_id,
        payment_intent_id,
        stripe_customer_id,
        customer_id,
        product_id,
        license_id,
        customer_email,
        amount_total,
        currency,
        status
    )
    VALUES (
        p_checkout_session_id,
        p_payment_intent_id,
        p_stripe_customer_id,
        v_customer.id,
        v_product.id,
        v_license.id,
        LOWER(TRIM(p_customer_email)),
        COALESCE(p_amount_total, 0),
        COALESCE(NULLIF(TRIM(p_currency), ''), 'usd'),
        'fulfilled'
    )
    RETURNING * INTO v_existing_order;

    RETURN jsonb_build_object(
        'order_id', v_existing_order.id,
        'customer_id', v_customer.id,
        'license_id', v_license.id,
        'license_key', v_license.license_key,
        'customer_email', LOWER(TRIM(p_customer_email)),
        'product_slug', v_product.slug,
        'product_name', v_product.name,
        'status', v_existing_order.status
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_store_checkout(
    text, text, text, text, text, text, bigint, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.fulfill_store_checkout(
    text, text, text, text, text, text, bigint, text
) TO service_role;
