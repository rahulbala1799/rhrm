-- Protect owner's membership from other admins
-- Updates memberships RLS policies to prevent owner demotion/removal

-- Drop existing memberships update policy
DROP POLICY IF EXISTS memberships_update_policy_admin ON memberships;

-- Recreate with owner protection
CREATE POLICY memberships_update_policy_admin ON memberships
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        AND user_id != auth.uid() -- Cannot modify own membership
        AND NOT public.is_tenant_owner(user_id, tenant_id) -- Cannot modify owner's membership
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        AND user_id != auth.uid()
        AND NOT public.is_tenant_owner(user_id, tenant_id)
    );

-- Drop existing memberships delete policy
DROP POLICY IF EXISTS memberships_delete_policy_admin ON memberships;

-- Recreate with owner protection
CREATE POLICY memberships_delete_policy_admin ON memberships
    FOR DELETE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        AND user_id != auth.uid() -- Cannot delete own membership
        AND NOT public.is_tenant_owner(user_id, tenant_id) -- Cannot delete owner's membership
    );

-- Add comment explaining owner protection
COMMENT ON POLICY memberships_update_policy_admin ON memberships IS 
'Admins can update memberships except their own and the owner''s. Owner is protected from demotion/removal by other admins.';

COMMENT ON POLICY memberships_delete_policy_admin ON memberships IS 
'Admins can delete memberships except their own and the owner''s. Owner is protected from removal by other admins.';




