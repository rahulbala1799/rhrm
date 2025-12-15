-- Prevent client-side membership activation
-- Only server-side flows (invitation acceptance) can create active memberships
-- Clients can only create 'invited' status memberships

-- Drop existing update policy
DROP POLICY IF EXISTS memberships_update_policy_admin ON memberships;

-- Recreate policy with status change restrictions
-- Note: WITH CHECK cannot reference OLD directly, so we use a subquery to check existing status
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
        -- Prevent client-side activation: cannot change status to 'active'
        -- Check if existing row already has status 'active' (allow updates to active memberships)
        -- If setting status to 'active', it must already be 'active' (no change)
        AND (
            status != 'active' -- Cannot set status to 'active' from client
            OR EXISTS (
                SELECT 1 FROM memberships m 
                WHERE m.id = memberships.id 
                AND m.status = 'active'
            ) -- Allow if already active (updating other fields)
        )
    );

-- Add comment
COMMENT ON POLICY memberships_update_policy_admin ON memberships IS 
'Admins can update memberships except their own and the owner''s. Cannot activate memberships (status=active) from client - only via server-side invitation acceptance.';

