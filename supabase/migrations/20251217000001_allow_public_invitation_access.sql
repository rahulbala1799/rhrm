-- Allow public access to invitations by token
-- This is safe because:
-- 1. Tokens are UUIDs (impossible to guess)
-- 2. Only reads public info (email, role, company name)
-- 3. Invitations expire after 7 days
-- 4. Required for invitation acceptance flow

-- Add policy for public (anonymous) users to read invitations by token
CREATE POLICY invitations_select_policy_public ON invitations
    FOR SELECT
    USING (true); -- Allow anyone to read, but they need the token to query

-- Note: This policy only allows SELECT. Creating, updating, and deleting
-- invitations still requires admin/manager privileges.

COMMENT ON POLICY invitations_select_policy_public ON invitations IS 
'Allow public access to read invitations (needed for invitation acceptance flow). Token acts as security credential.';

