-- Indexes for performance optimization

-- Tenant ID indexes (all tenant-scoped tables)
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_id ON memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_user ON memberships(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON locations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_location_id ON staff(location_id);

CREATE INDEX IF NOT EXISTS idx_availability_tenant_id ON availability(tenant_id);
CREATE INDEX IF NOT EXISTS idx_availability_staff_id ON availability(staff_id);

CREATE INDEX IF NOT EXISTS idx_shifts_tenant_id ON shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shifts_location_id ON shifts(location_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);

CREATE INDEX IF NOT EXISTS idx_timesheets_tenant_id ON timesheets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_staff_id ON timesheets(staff_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_shift_id ON timesheets(shift_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON timesheets(date);
CREATE INDEX IF NOT EXISTS idx_timesheets_date_staff ON timesheets(date, staff_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);

CREATE INDEX IF NOT EXISTS idx_compliance_documents_tenant_id ON compliance_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_staff_id ON compliance_documents(staff_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_expiry_date ON compliance_documents(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type_id ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Additional indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_shifts_tenant_start_time ON shifts(tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_timesheets_tenant_date ON timesheets(tenant_id, date);

