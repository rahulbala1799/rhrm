-- Update tenant creation function to set owner_user_id

-- Drop and recreate the function to include owner assignment
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
    -- Create tenant with owner_user_id set
    INSERT INTO tenants (name, slug, subscription_tier, owner_user_id)
    VALUES (p_tenant_name, p_tenant_slug, 'free', p_admin_user_id)
    RETURNING id INTO v_tenant_id;

    -- Create admin membership for the creator (who is also the owner)
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

