-- ============================================================
-- ONETIME LABS STORE
-- STREAMSAFE 0.12.2 RELEASE METADATA
-- ============================================================
-- Apply to the existing OneTime Labs Licensing Supabase DB after
-- the 0.12.2 installer is staged in the private software-releases
-- bucket.
-- ============================================================

UPDATE public.products
SET
    current_version = '0.12.2',
    updated_at = now()
WHERE slug = 'streamsafe';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.products
        WHERE slug = 'streamsafe'
          AND current_version = '0.12.2'
    ) THEN
        RAISE EXCEPTION
            'StreamSafe product row was not found or could not be updated to 0.12.2.';
    END IF;
END
$$;
