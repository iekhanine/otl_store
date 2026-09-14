-- ============================================================
-- ONETIME LABS PLATFORM / STORE
-- Company Owner role for Store seller applicants
--
-- Run once in the shared Supabase project.
-- Safe to run again.
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.platform_roles
        WHERE code = 'company_owner'
           OR lower(display_name) = lower('Company Owner')
    ) THEN
        INSERT INTO public.platform_roles (
            code,
            display_name,
            description,
            sort_order
        )
        VALUES (
            'company_owner',
            'Company Owner',
            'Owns and administers a customer organization.',
            10
        );
    END IF;
END
$$;

SELECT
    id,
    code,
    display_name
FROM public.platform_roles
WHERE code = 'company_owner'
   OR lower(display_name) = lower('Company Owner');
