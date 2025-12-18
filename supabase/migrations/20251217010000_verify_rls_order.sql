-- Ensure public policies are at the right priority
-- Drop and recreate to ensure they're registered properly

-- Drop existing public policies
DROP POLICY IF EXISTS invitations_select_policy_public ON invitations;
DROP POLICY IF EXISTS tenants_select_policy_public ON tenants;

-- Recreate invitations public policy (highest priority)
CREATE POLICY invitations_select_policy_public ON invitations
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Recreate tenants public policy (highest priority)  
CREATE POLICY tenants_select_policy_public ON tenants
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Add comments
COMMENT ON POLICY invitations_select_policy_public ON invitations IS 
'Allow all users (including anonymous) to read invitations. Required for invitation acceptance flow.';

COMMENT ON POLICY tenants_select_policy_public ON tenants IS 
'Allow all users (including anonymous) to read tenant info. Required for invitation display.';




