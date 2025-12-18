-- Invite-only onboarding: Prevent direct membership inserts from clients
-- Memberships should only be created when invitations are accepted

-- Drop existing memberships insert policy
DROP POLICY IF EXISTS memberships_insert_policy_admin ON memberships;

-- New policy: Admins can only create memberships with status='invited'
-- Actual membership creation happens server-side when invitation is accepted
CREATE POLICY memberships_insert_policy_admin ON memberships
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        AND status = 'invited' -- Only invited status allowed from client
        AND role != 'superadmin' -- Cannot create superadmin from client
    );

-- Note: Actual membership activation (status='active') happens via:
-- 1. Server-side API route /api/invitations/accept
-- 2. Uses service role to create active membership
-- 3. This ensures proper audit logging and validation

-- Add comment
COMMENT ON POLICY memberships_insert_policy_admin ON memberships IS 
'Admins can create invitation records (status=invited). Active memberships are created server-side when invitations are accepted.';




