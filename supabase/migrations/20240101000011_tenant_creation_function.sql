-- Atomic tenant creation function
-- Creates tenant + first admin membership in a single transaction
-- This avoids the deadlock: user can't create tenant (not a member), can't create membership (no tenant)

CREATE OR REPLACE FUNCTION public.create_tenant_with_admin(
    p_tenant_name TEXT,
    p_tenant_slug TEXT,
    p_admin_user_id UUID
)
RETURNS TABLE (
    tenant_id UUID,
    membership_id UUID
) AS $$
DECLARE
    v_tenant_id UUID;
    v_membership_id UUID;
BEGIN
    -- Create tenant
    INSERT INTO tenants (name, slug, subscription_tier)
    VALUES (p_tenant_name, p_tenant_slug, 'free')
    RETURNING id INTO v_tenant_id;

    -- Create admin membership for the creator
    INSERT INTO memberships (
        tenant_id,
        user_id,
        role,
        status,
        joined_at
    )
    VALUES (
        v_tenant_id,
        p_admin_user_id,
        'admin',
        'active',
        NOW()
    )
    RETURNING id INTO v_membership_id;

    -- Return both IDs
    RETURN QUERY SELECT v_tenant_id, v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
-- Note: This function should only be called via server API route with service role
-- The SECURITY DEFINER allows it to bypass RLS for initial setup
GRANT EXECUTE ON FUNCTION public.create_tenant_with_admin TO authenticated;

-- Revoke public execute (only authenticated users can call, but should use service role)
REVOKE EXECUTE ON FUNCTION public.create_tenant_with_admin FROM PUBLIC;

