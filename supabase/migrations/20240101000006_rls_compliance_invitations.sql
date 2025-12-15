-- RLS Policies for compliance documents and invitations
-- Using membership-based access control (NOT JWT claims)

-- COMPLIANCE DOCUMENTS TABLE POLICIES

-- Admin: full CRUD on compliance documents in their tenant
CREATE POLICY compliance_documents_select_policy_admin ON compliance_documents
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY compliance_documents_insert_policy_admin ON compliance_documents
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY compliance_documents_update_policy_admin ON compliance_documents
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY compliance_documents_delete_policy_admin ON compliance_documents
    FOR DELETE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

-- Manager: can read, insert, and verify compliance documents
CREATE POLICY compliance_documents_select_policy_manager ON compliance_documents
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY compliance_documents_insert_policy_manager ON compliance_documents
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

-- Manager: can update to verify documents
CREATE POLICY compliance_documents_update_policy_manager ON compliance_documents
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

-- Staff: can only manage their own compliance documents (if pending)
CREATE POLICY compliance_documents_select_policy_staff ON compliance_documents
    FOR SELECT
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
    );

CREATE POLICY compliance_documents_insert_policy_staff ON compliance_documents
    FOR INSERT
    WITH CHECK (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
    );

-- Staff: can only update their own documents if status is 'pending'
CREATE POLICY compliance_documents_update_policy_staff ON compliance_documents
    FOR UPDATE
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
        AND status = 'pending'
    )
    WITH CHECK (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
        AND status = 'pending'
    );

-- Enable RLS
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

-- INVITATIONS TABLE POLICIES

-- Admin: full CRUD on invitations in their tenant
CREATE POLICY invitations_select_policy_admin ON invitations
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY invitations_insert_policy_admin ON invitations
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY invitations_update_policy_admin ON invitations
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY invitations_delete_policy_admin ON invitations
    FOR DELETE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

-- Manager: can read and insert invitations (no update/delete)
CREATE POLICY invitations_select_policy_manager ON invitations
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY invitations_insert_policy_manager ON invitations
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

