-- RLS Policies for shifts and timesheets
-- Using membership-based access control (NOT JWT claims)

-- SHIFTS TABLE POLICIES

-- Admin: full CRUD on shifts in their tenant
CREATE POLICY shifts_select_policy_admin ON shifts
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY shifts_insert_policy_admin ON shifts
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY shifts_update_policy_admin ON shifts
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY shifts_delete_policy_admin ON shifts
    FOR DELETE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

-- Manager: full CRUD on shifts in their tenant
CREATE POLICY shifts_select_policy_manager ON shifts
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY shifts_insert_policy_manager ON shifts
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY shifts_update_policy_manager ON shifts
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY shifts_delete_policy_manager ON shifts
    FOR DELETE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

-- Staff: can only read/update their own shifts
CREATE POLICY shifts_select_policy_staff ON shifts
    FOR SELECT
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY shifts_update_policy_staff ON shifts
    FOR UPDATE
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
    );

-- Enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- TIMESHEETS TABLE POLICIES

-- Admin: full CRUD on timesheets in their tenant
CREATE POLICY timesheets_select_policy_admin ON timesheets
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY timesheets_insert_policy_admin ON timesheets
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY timesheets_update_policy_admin ON timesheets
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY timesheets_delete_policy_admin ON timesheets
    FOR DELETE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

-- Manager: can read, insert, and approve/reject timesheets
CREATE POLICY timesheets_select_policy_manager ON timesheets
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY timesheets_insert_policy_manager ON timesheets
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

-- Manager: can update to approve/reject timesheets
CREATE POLICY timesheets_update_policy_manager ON timesheets
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

-- Staff: can only manage their own timesheets (if draft)
CREATE POLICY timesheets_select_policy_staff ON timesheets
    FOR SELECT
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY timesheets_insert_policy_staff ON timesheets
    FOR INSERT
    WITH CHECK (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
    );

-- Staff: can only update their own timesheets if status is 'draft'
CREATE POLICY timesheets_update_policy_staff ON timesheets
    FOR UPDATE
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
        AND status = 'draft'
    )
    WITH CHECK (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
        AND status = 'draft'
    );

-- Staff: can only delete their own timesheets if status is 'draft'
CREATE POLICY timesheets_delete_policy_staff ON timesheets
    FOR DELETE
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
        AND status = 'draft'
    );

-- Enable RLS
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
