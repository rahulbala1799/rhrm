-- Storage setup: buckets and policies
-- Note: Bucket creation must be done via Supabase Dashboard or API
-- This migration creates the policies only

-- Storage policies are created via Supabase Storage API or Dashboard
-- The following SQL creates helper functions for storage path validation

-- Function to validate storage path includes tenant_id
CREATE OR REPLACE FUNCTION public.validate_storage_path_tenant(
    path TEXT,
    expected_tenant_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Path format: /tenants/{tenant_id}/...
    RETURN path ~ ('^/tenants/' || expected_tenant_id::text || '/');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract tenant_id from storage path
CREATE OR REPLACE FUNCTION public.extract_tenant_id_from_path(path TEXT)
RETURNS UUID AS $$
DECLARE
    tenant_uuid UUID;
BEGIN
    -- Extract UUID from path pattern: /tenants/{uuid}/...
    SELECT (regexp_match(path, '^/tenants/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'))[1]::uuid
    INTO tenant_uuid;
    
    RETURN tenant_uuid;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Note: Actual storage bucket policies are configured via:
-- 1. Supabase Dashboard → Storage → Policies
-- 2. Or via Supabase Storage API
--
-- Recommended bucket policies:
--
-- compliance-docs bucket:
--   - SELECT: User has membership in tenant (extracted from path)
--   - INSERT: User has membership in tenant AND is staff member (for own docs) OR admin/manager
--   - UPDATE: User has membership in tenant AND is admin/manager
--   - DELETE: User has membership in tenant AND is admin
--
-- exports bucket:
--   - SELECT: User has admin role in tenant (extracted from path)
--   - INSERT: System only (service role)
--   - UPDATE: System only (service role)
--   - DELETE: System only (service role)



