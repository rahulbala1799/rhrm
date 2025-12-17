-- Fix profiles RLS policy performance
-- Replace heavy self-join with simpler same-tenant check

-- Drop existing profiles select policy
DROP POLICY IF EXISTS profiles_select_policy_all ON profiles;

-- Create optimized policy: Check if profile user shares any tenant with viewer
CREATE POLICY profiles_select_policy_all ON profiles
    FOR SELECT
    USING (
        -- Own profile
        id = auth.uid()
        OR
        -- Profile belongs to user in same tenant (simpler check)
        EXISTS (
            SELECT 1
            FROM memberships m_viewer
            WHERE m_viewer.user_id = auth.uid()
                AND m_viewer.status = 'active'
                AND EXISTS (
                    SELECT 1
                    FROM memberships m_profile
                    WHERE m_profile.user_id = profiles.id
                        AND m_profile.tenant_id = m_viewer.tenant_id
                        AND m_profile.status = 'active'
                )
        )
    );

-- This avoids the expensive self-join on memberships
-- Instead uses two EXISTS subqueries which are more efficient


