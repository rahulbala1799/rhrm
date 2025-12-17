-- Owner transfer function (server-side only, called via service role)
-- Allows owner to safely transfer ownership or step down

CREATE OR REPLACE FUNCTION public.transfer_tenant_ownership(
    p_tenant_id UUID,
    p_current_owner_id UUID,
    p_new_owner_id UUID,
    p_demote_old_owner BOOLEAN DEFAULT false
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_new_owner_membership_id UUID;
    v_new_owner_role TEXT;
    v_admin_count INTEGER;
BEGIN
    -- Safety check 1: Verify current user is actually the owner
    IF NOT EXISTS (
        SELECT 1 FROM tenants
        WHERE id = p_tenant_id
            AND owner_user_id = p_current_owner_id
    ) THEN
        RETURN QUERY SELECT false, 'Current user is not the tenant owner'::TEXT;
        RETURN;
    END IF;

    -- Safety check 2: Verify new owner has active membership in tenant
    SELECT id, role INTO v_new_owner_membership_id, v_new_owner_role
    FROM memberships
    WHERE tenant_id = p_tenant_id
        AND user_id = p_new_owner_id
        AND status = 'active'
    LIMIT 1;

    IF v_new_owner_membership_id IS NULL THEN
        RETURN QUERY SELECT false, 'Target user does not have active membership in this tenant'::TEXT;
        RETURN;
    END IF;

    -- Safety check 3: Verify new owner is at least admin (or promote if needed)
    IF v_new_owner_role NOT IN ('admin', 'superadmin') THEN
        -- Promote to admin during transfer
        UPDATE memberships
        SET role = 'admin'
        WHERE id = v_new_owner_membership_id;
        v_new_owner_role := 'admin';
    END IF;

    -- Safety check 4: Ensure at least one admin remains after transfer
    -- Count admins excluding current owner (if being demoted)
    SELECT COUNT(*) INTO v_admin_count
    FROM memberships
    WHERE tenant_id = p_tenant_id
        AND status = 'active'
        AND role IN ('admin', 'superadmin')
        AND (NOT p_demote_old_owner OR user_id != p_current_owner_id);

    IF v_admin_count < 1 THEN
        RETURN QUERY SELECT false, 'Transfer would leave tenant without any admins. At least one admin must remain.'::TEXT;
        RETURN;
    END IF;

    -- Perform transfer: Update owner_user_id
    UPDATE tenants
    SET owner_user_id = p_new_owner_id
    WHERE id = p_tenant_id;

    -- Optionally demote old owner (only if requested and safe)
    IF p_demote_old_owner THEN
        -- Only demote if there's at least one other admin
        IF v_admin_count >= 1 THEN
            UPDATE memberships
            SET role = 'manager'
            WHERE tenant_id = p_tenant_id
                AND user_id = p_current_owner_id
                AND status = 'active';
        END IF;
    END IF;

    -- Log to audit (will be called from API route with proper context)
    -- Audit logging happens at API level with full context

    RETURN QUERY SELECT true, 'Ownership transferred successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only service role can execute (no grants to authenticated)
-- This function must be called via server-side API route using service role
REVOKE EXECUTE ON FUNCTION public.transfer_tenant_ownership FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transfer_tenant_ownership FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.transfer_tenant_ownership FROM anon;



