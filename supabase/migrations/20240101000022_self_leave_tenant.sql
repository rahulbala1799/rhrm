-- Self-leave tenant function (server-side only)
-- Allows users to leave a tenant they belong to, with safety checks

CREATE OR REPLACE FUNCTION public.self_leave_tenant(
    p_tenant_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_membership_id UUID;
    v_role TEXT;
    v_is_owner BOOLEAN;
    v_admin_count INTEGER;
BEGIN
    -- Safety check 1: Verify user has active membership in tenant
    SELECT id, role INTO v_membership_id, v_role
    FROM memberships
    WHERE tenant_id = p_tenant_id
        AND user_id = p_user_id
        AND status = 'active'
    LIMIT 1;

    IF v_membership_id IS NULL THEN
        RETURN QUERY SELECT false, 'User does not have active membership in this tenant'::TEXT;
        RETURN;
    END IF;

    -- Safety check 2: Prevent owner from leaving (must transfer ownership first)
    v_is_owner := public.is_tenant_owner(p_user_id, p_tenant_id);
    IF v_is_owner THEN
        RETURN QUERY SELECT false, 'Tenant owner cannot leave. Please transfer ownership first.'::TEXT;
        RETURN;
    END IF;

    -- Safety check 3: If user is the only admin, prevent leaving
    IF v_role = 'admin' THEN
        SELECT COUNT(*) INTO v_admin_count
        FROM memberships
        WHERE tenant_id = p_tenant_id
            AND status = 'active'
            AND role IN ('admin', 'superadmin')
            AND user_id != p_user_id; -- Exclude current user

        IF v_admin_count = 0 THEN
            RETURN QUERY SELECT false, 'Cannot leave: you are the only admin. Please promote another user to admin first, or transfer ownership.'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Deactivate membership (soft delete - set status to 'suspended')
    -- Note: Using 'suspended' status for self-leave to maintain audit trail
    -- Alternative: Could add 'inactive' status to enum if needed
    UPDATE memberships
    SET status = 'suspended',
        updated_at = NOW()
    WHERE id = v_membership_id;

    -- Log to audit (will be called from API route with proper context)
    -- Audit logging happens at API level with full context

    RETURN QUERY SELECT true, 'Successfully left tenant'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only service role can execute (no grants to authenticated)
-- This function must be called via server-side API route using service role
REVOKE EXECUTE ON FUNCTION public.self_leave_tenant FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.self_leave_tenant FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.self_leave_tenant FROM anon;

-- Add comment
COMMENT ON FUNCTION public.self_leave_tenant IS 
'Allows users to leave a tenant with safety checks: owner cannot leave, last admin cannot leave. Must be called via server-side API route.';

