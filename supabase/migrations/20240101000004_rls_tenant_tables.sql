-- RLS Policies for all tenant-scoped tables
-- Using membership-based access control (NOT JWT claims)

-- LOCATIONS TABLE POLICIES

-- Admin: full CRUD on locations in their tenant
CREATE POLICY locations_select_policy_admin ON locations
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY locations_insert_policy_admin ON locations
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY locations_update_policy_admin ON locations
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY locations_delete_policy_admin ON locations
    FOR DELETE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

-- Manager: can read, insert, update locations (no delete)
CREATE POLICY locations_select_policy_manager ON locations
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY locations_insert_policy_manager ON locations
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY locations_update_policy_manager ON locations
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

-- Staff: read-only access to locations in their tenant
CREATE POLICY locations_select_policy_staff ON locations
    FOR SELECT
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
    );

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- STAFF TABLE POLICIES

-- Admin: full CRUD on staff in their tenant
CREATE POLICY staff_select_policy_admin ON staff
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY staff_insert_policy_admin ON staff
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY staff_update_policy_admin ON staff
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY staff_delete_policy_admin ON staff
    FOR DELETE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

-- Manager: can read, insert, update staff (no delete)
CREATE POLICY staff_select_policy_manager ON staff
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY staff_insert_policy_manager ON staff
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY staff_update_policy_manager ON staff
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

-- Staff: can only read/update their own record
CREATE POLICY staff_select_policy_staff ON staff
    FOR SELECT
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND (
            user_id = auth.uid()
            OR public.user_is_staff_member(auth.uid(), id)
        )
    );

CREATE POLICY staff_update_policy_staff ON staff
    FOR UPDATE
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND user_id = auth.uid()
    )
    WITH CHECK (
        public.user_has_membership(auth.uid(), tenant_id)
        AND user_id = auth.uid()
    );

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- AVAILABILITY TABLE POLICIES

-- Admin: full CRUD on availability in their tenant
CREATE POLICY availability_select_policy_admin ON availability
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY availability_insert_policy_admin ON availability
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY availability_update_policy_admin ON availability
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY availability_delete_policy_admin ON availability
    FOR DELETE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

-- Manager: full CRUD on availability in their tenant
CREATE POLICY availability_select_policy_manager ON availability
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY availability_insert_policy_manager ON availability
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY availability_update_policy_manager ON availability
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY availability_delete_policy_manager ON availability
    FOR DELETE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

-- Staff: can only manage their own availability
CREATE POLICY availability_select_policy_staff ON availability
    FOR SELECT
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND public.user_is_staff_member(auth.uid(), staff_id)
    );

CREATE POLICY availability_insert_policy_staff ON availability
    FOR INSERT
    WITH CHECK (
        public.user_has_membership(auth.uid(), tenant_id)
        AND public.user_is_staff_member(auth.uid(), staff_id)
    );

CREATE POLICY availability_update_policy_staff ON availability
    FOR UPDATE
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND public.user_is_staff_member(auth.uid(), staff_id)
    )
    WITH CHECK (
        public.user_has_membership(auth.uid(), tenant_id)
        AND public.user_is_staff_member(auth.uid(), staff_id)
    );

CREATE POLICY availability_delete_policy_staff ON availability
    FOR DELETE
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND public.user_is_staff_member(auth.uid(), staff_id)
    );

-- Enable RLS
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
