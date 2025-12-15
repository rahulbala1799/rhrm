-- Tenant Owner Implementation
-- Adds owner_user_id to tenants table and protects owner from admin actions

-- 1. Add owner_user_id column to tenants table (nullable first for backfill)
ALTER TABLE tenants
ADD COLUMN owner_user_id UUID REFERENCES profiles(id) ON DELETE RESTRICT;

-- 2. Backfill owner_user_id for existing tenants
-- Set owner to the earliest active admin membership for each tenant
UPDATE tenants t
SET owner_user_id = (
    SELECT m.user_id
    FROM memberships m
    WHERE m.tenant_id = t.id
        AND m.role = 'admin'
        AND m.status = 'active'
    ORDER BY m.created_at ASC
    LIMIT 1
)
WHERE owner_user_id IS NULL;

-- If no admin exists, use earliest active membership
UPDATE tenants t
SET owner_user_id = (
    SELECT m.user_id
    FROM memberships m
    WHERE m.tenant_id = t.id
        AND m.status = 'active'
    ORDER BY m.created_at ASC
    LIMIT 1
)
WHERE owner_user_id IS NULL;

-- 3. Now make owner_user_id NOT NULL (after backfill)
ALTER TABLE tenants
ALTER COLUMN owner_user_id SET NOT NULL;

-- 4. Create index for owner lookups
CREATE INDEX IF NOT EXISTS idx_tenants_owner_user_id ON tenants(owner_user_id);

-- 5. Helper function: Check if user is tenant owner
CREATE OR REPLACE FUNCTION public.is_tenant_owner(
    user_uuid UUID,
    tenant_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM tenants
        WHERE id = tenant_uuid
            AND owner_user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Grant execute to authenticated (for RLS policies)
GRANT EXECUTE ON FUNCTION public.is_tenant_owner TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_tenant_owner FROM anon, public;

-- 6. Prevent client-side updates to owner_user_id
-- Create trigger to block owner_user_id changes from non-service-role sessions
CREATE OR REPLACE FUNCTION public.prevent_owner_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If owner_user_id is being changed, block it
    -- Only service role (which bypasses triggers via direct SQL) can change it
    -- This is a safety net - the RLS policy should prevent it first
    IF OLD.owner_user_id IS DISTINCT FROM NEW.owner_user_id THEN
        RAISE EXCEPTION 'owner_user_id cannot be changed via client operations. Use owner transfer procedure.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_owner_change_trigger
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_owner_change();

-- Note: Tenant creation function update is in migration 014

