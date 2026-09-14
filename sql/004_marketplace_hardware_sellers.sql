-- ============================================================
-- ONETIME LABS STORE 2.0
-- Hardware marketplace + seller accounts + cash sales
--
-- Run this in the SAME Supabase project used by the Store.
-- Existing Store / licensing tables are preserved.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- HEADER 001 - Store administrators
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_admins (
    auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;

-- Server APIs use service_role. No browser data policies are required here.

-- ============================================================
-- HEADER 002 - Seller accounts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_sellers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    display_name text NOT NULL,
    slug text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'suspended')),

    -- Stripe Connect fields are intentionally present now so the next
    -- implementation step can connect payouts without another redesign.
    stripe_account_id text UNIQUE,
    stripe_onboarding_complete boolean NOT NULL DEFAULT false,
    stripe_charges_enabled boolean NOT NULL DEFAULT false,
    stripe_payouts_enabled boolean NOT NULL DEFAULT false,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_sellers_status
ON public.store_sellers(status);

ALTER TABLE public.store_sellers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HEADER 003 - Marketplace listings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id uuid NOT NULL REFERENCES public.store_sellers(id) ON DELETE CASCADE,
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    category text NOT NULL DEFAULT 'hardware',
    subcategory text NOT NULL DEFAULT 'RAM',
    condition text NOT NULL DEFAULT 'Used - Tested',
    brand text,
    model text,
    sku text,
    price_cents bigint NOT NULL CHECK (price_cents > 0),
    shipping_price_cents bigint NOT NULL DEFAULT 0 CHECK (shipping_price_cents >= 0),
    currency text NOT NULL DEFAULT 'usd',
    quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'sold_out', 'archived')),
    image_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
    specs jsonb NOT NULL DEFAULT '{}'::jsonb,
    shipping_available boolean NOT NULL DEFAULT true,
    local_pickup_available boolean NOT NULL DEFAULT true,
    cash_sale_allowed boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_listings_seller
ON public.store_listings(seller_id);

CREATE INDEX IF NOT EXISTS idx_store_listings_public
ON public.store_listings(status, category, created_at DESC);

ALTER TABLE public.store_listings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HEADER 004 - Marketplace sales ledger
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid REFERENCES public.store_listings(id) ON DELETE SET NULL,
    seller_id uuid NOT NULL REFERENCES public.store_sellers(id) ON DELETE RESTRICT,
    buyer_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    buyer_email text,
    buyer_name text,
    buyer_contact text,

    channel text NOT NULL DEFAULT 'cash'
        CHECK (channel IN ('cash', 'stripe', 'manual')),

    quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price_cents bigint NOT NULL CHECK (unit_price_cents >= 0),
    subtotal_cents bigint NOT NULL CHECK (subtotal_cents >= 0),
    processor_fee_cents bigint NOT NULL DEFAULT 0 CHECK (processor_fee_cents >= 0),
    platform_fee_cents bigint NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),

    payment_status text NOT NULL DEFAULT 'paid',
    fulfillment_status text NOT NULL DEFAULT 'completed',

    stripe_checkout_session_id text UNIQUE,
    stripe_payment_intent_id text UNIQUE,

    cash_note text,
    sold_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_sales_seller_date
ON public.store_sales(seller_id, sold_at DESC);

ALTER TABLE public.store_sales ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HEADER 005 - updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_marketplace_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_sellers_set_updated_at ON public.store_sellers;
CREATE TRIGGER store_sellers_set_updated_at
BEFORE UPDATE ON public.store_sellers
FOR EACH ROW EXECUTE FUNCTION public.set_marketplace_updated_at();

DROP TRIGGER IF EXISTS store_listings_set_updated_at ON public.store_listings;
CREATE TRIGGER store_listings_set_updated_at
BEFORE UPDATE ON public.store_listings
FOR EACH ROW EXECUTE FUNCTION public.set_marketplace_updated_at();

-- ============================================================
-- HEADER 006 - Atomic Sold - Cash transaction
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_store_cash_sale(
    p_listing_id uuid,
    p_seller_id uuid,
    p_quantity integer,
    p_unit_price_cents bigint,
    p_buyer_name text DEFAULT NULL,
    p_buyer_contact text DEFAULT NULL,
    p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_listing public.store_listings%ROWTYPE;
    v_sale_id uuid;
    v_remaining integer;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be at least 1.';
    END IF;

    IF p_unit_price_cents IS NULL OR p_unit_price_cents <= 0 THEN
        RAISE EXCEPTION 'Cash sale price must be greater than zero.';
    END IF;

    SELECT *
    INTO v_listing
    FROM public.store_listings
    WHERE id = p_listing_id
      AND seller_id = p_seller_id
    FOR UPDATE;

    IF v_listing.id IS NULL THEN
        RAISE EXCEPTION 'Listing not found.';
    END IF;

    IF NOT v_listing.cash_sale_allowed THEN
        RAISE EXCEPTION 'Cash sales are disabled for this listing.';
    END IF;

    IF v_listing.status = 'archived' THEN
        RAISE EXCEPTION 'Archived listings cannot be sold.';
    END IF;

    IF v_listing.quantity < p_quantity THEN
        RAISE EXCEPTION 'Only % unit(s) remain in inventory.', v_listing.quantity;
    END IF;

    INSERT INTO public.store_sales (
        listing_id,
        seller_id,
        buyer_name,
        buyer_contact,
        channel,
        quantity,
        unit_price_cents,
        subtotal_cents,
        processor_fee_cents,
        platform_fee_cents,
        payment_status,
        fulfillment_status,
        cash_note,
        sold_at
    )
    VALUES (
        v_listing.id,
        p_seller_id,
        NULLIF(TRIM(p_buyer_name), ''),
        NULLIF(TRIM(p_buyer_contact), ''),
        'cash',
        p_quantity,
        p_unit_price_cents,
        p_quantity * p_unit_price_cents,
        0,
        0,
        'paid',
        'completed',
        NULLIF(TRIM(p_note), ''),
        now()
    )
    RETURNING id INTO v_sale_id;

    v_remaining := v_listing.quantity - p_quantity;

    UPDATE public.store_listings
    SET
        quantity = v_remaining,
        status = CASE
            WHEN v_remaining = 0 THEN 'sold_out'
            ELSE status
        END,
        updated_at = now()
    WHERE id = v_listing.id;

    RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_store_cash_sale(uuid, uuid, integer, bigint, text, text, text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_store_cash_sale(uuid, uuid, integer, bigint, text, text, text)
TO service_role;

-- ============================================================
-- HEADER 007 - Product image bucket
-- Small images remain on Supabase Free. Large software binaries do not.
-- ============================================================

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'store-product-images',
    'store-product-images',
    true,
    6291456,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id)
DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Store product images public read" ON storage.objects;
CREATE POLICY "Store product images public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'store-product-images');

DROP POLICY IF EXISTS "Seller uploads own product images" ON storage.objects;
CREATE POLICY "Seller uploads own product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'store-product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Seller updates own product images" ON storage.objects;
CREATE POLICY "Seller updates own product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'store-product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'store-product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Seller deletes own product images" ON storage.objects;
CREATE POLICY "Seller deletes own product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'store-product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- HEADER 008 - First administrator
--
-- OPTION A (easiest): Set Vercel STORE_ADMIN_EMAILS to your Store login
-- email. The API will recognize it without inserting a row here.
--
-- OPTION B: After your admin account exists, run this separately:
--
-- INSERT INTO public.store_admins (auth_user_id, email)
-- SELECT id, email
-- FROM auth.users
-- WHERE lower(email) = lower('YOUR_EMAIL_HERE')
-- ON CONFLICT (auth_user_id)
-- DO UPDATE SET email = EXCLUDED.email;
-- ============================================================
