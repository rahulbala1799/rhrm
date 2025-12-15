-- RLS Policies for core tables: tenants, profiles, memberships
-- Using membership-based access control (NOT JWT claims)

-- TENANTS TABLE POLICIES

-- Users can only read tenants where they have an active membership
CREATE POLICY tenants_select_policy_members ON tenants
    FOR SELECT
    USING (
        public.user_has_membership(auth.uid(), id)
    );

-- Admin: can update tenant where they have admin role
CREATE POLICY tenants_update_policy_admin ON tenants
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), id, 'admin')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), id, 'admin')
    );

-- Note: Superadmin access is handled server-side only (service role)
-- No client-level superadmin RLS policies

-- PROFILES TABLE POLICIES

-- Users can read their own profile
-- Users can read profiles of users in same tenant (via membership check)
CREATE POLICY profiles_select_policy_all ON profiles
    FOR SELECT
    USING (
        id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM memberships m1
            JOIN memberships m2 ON m1.tenant_id = m2.tenant_id
            WHERE m1.user_id = auth.uid()
                AND m2.user_id = profiles.id
                AND m1.status = 'active'
                AND m2.status = 'active'
        )
    );

-- Users: can insert their own profile (handled by trigger, but policy needed)
CREATE POLICY profiles_insert_policy_own ON profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- Users: can update own profile
CREATE POLICY profiles_update_policy_own ON profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- MEMBERSHIPS TABLE POLICIES

-- Users can read memberships in tenants where they have active membership
CREATE POLICY memberships_select_policy_tenant_members ON memberships
    FOR SELECT
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
    );

-- Admin: can insert memberships in tenants where they are admin
CREATE POLICY memberships_insert_policy_admin ON memberships
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

-- Admin: can update memberships in their tenant (except own membership)
CREATE POLICY memberships_update_policy_admin ON memberships
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        AND user_id != auth.uid() -- Cannot modify own membership
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        AND user_id != auth.uid()
    );

-- Admin: can delete memberships in their tenant (except own)
CREATE POLICY memberships_delete_policy_admin ON memberships
    FOR DELETE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        AND user_id != auth.uid()
    );

