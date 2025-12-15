-- RLS Policies for notifications and audit logs
-- Using membership-based access control (NOT JWT claims)

-- NOTIFICATIONS TABLE POLICIES

-- All users: can only read their own notifications
CREATE POLICY notifications_select_policy_all ON notifications
    FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- System only: insertions handled by server-side code (service role)
-- No INSERT policy for clients

-- Users: can update their own notifications (mark as read)
CREATE POLICY notifications_update_policy_own ON notifications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- AUDIT LOGS TABLE POLICIES

-- Admin: can read audit logs in their tenant
CREATE POLICY audit_logs_select_policy_admin ON audit_logs
    FOR SELECT
    USING (
        tenant_id IS NULL  -- System actions (no tenant)
        OR public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

-- Manager: can read audit logs in their tenant (read-only)
CREATE POLICY audit_logs_select_policy_manager ON audit_logs
    FOR SELECT
    USING (
        tenant_id IS NOT NULL
        AND public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

-- Staff: can only read their own audit log entries
CREATE POLICY audit_logs_select_policy_staff ON audit_logs
    FOR SELECT
    USING (
        user_id = auth.uid()
        AND tenant_id IS NOT NULL
        AND public.user_has_membership(auth.uid(), tenant_id)
    );

-- System only: insertions handled by server-side code (service role) and triggers
-- No INSERT policy for clients

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

