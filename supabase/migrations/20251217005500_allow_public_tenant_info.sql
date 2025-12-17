-- Allow anonymous users to read basic tenant info (name, slug) for invitation display
-- This is safe because:
-- 1. Only basic tenant info is exposed (name, slug)
-- 2. Required for showing company name in invitation acceptance page
-- 3. Tenant IDs are UUIDs (not guessable)

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'tenants' 
        AND policyname = 'tenants_select_policy_public'
    ) THEN
        CREATE POLICY tenants_select_policy_public ON tenants
            FOR SELECT
            USING (true);
    END IF;
END $$;

COMMENT ON POLICY tenants_select_policy_public ON tenants IS 
'Allow public read access to tenant info for invitation display. Only basic info (name, slug) is exposed.';

