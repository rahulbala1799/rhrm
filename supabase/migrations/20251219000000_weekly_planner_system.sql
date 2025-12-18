-- Weekly Planner System Migration
-- Creates tenant_settings and shift_audit_log tables
-- Updates RLS policies for staff shift updates with tenant setting check

-- 1. Create tenant_settings table
CREATE TABLE IF NOT EXISTS tenant_settings (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    staff_can_accept_decline_shifts BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for timezone lookups
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);

-- 2. Create shift_audit_log table
CREATE TABLE IF NOT EXISTS shift_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'deleted', 'published', 'unpublished', 'confirmed', 'cancelled', 'reassigned', 'time_changed', 'location_changed', 'break_changed', 'notes_changed')),
    is_post_start_edit BOOLEAN NOT NULL DEFAULT false,
    before_snapshot JSONB,
    after_snapshot JSONB,
    message TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES profiles(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for shift_audit_log
CREATE INDEX IF NOT EXISTS idx_shift_audit_log_tenant_id ON shift_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_audit_log_shift_id ON shift_audit_log(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_audit_log_changed_at ON shift_audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_shift_audit_log_is_post_start_edit ON shift_audit_log(is_post_start_edit) WHERE is_post_start_edit = true;

-- 3. Enable RLS on new tables
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_audit_log ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for tenant_settings
-- Users can read tenant settings for tenants where they have active membership
CREATE POLICY tenant_settings_select_policy ON tenant_settings
    FOR SELECT
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
    );

-- Admin/Manager can update tenant settings
CREATE POLICY tenant_settings_update_policy ON tenant_settings
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        OR public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        OR public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

-- 5. RLS Policies for shift_audit_log
-- Admin/Manager can read audit logs for their tenant
CREATE POLICY shift_audit_log_select_policy_admin ON shift_audit_log
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        OR public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

-- Staff can read audit logs for their own shifts only
CREATE POLICY shift_audit_log_select_policy_staff ON shift_audit_log
    FOR SELECT
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND shift_id IN (
            SELECT id FROM shifts WHERE staff_id IN (
                SELECT id FROM staff WHERE user_id = auth.uid()
            )
        )
    );

-- Only system (via service role) can insert audit logs
-- No client-side insert policy (audit logs are immutable)

-- 6. Update staff shift UPDATE policy to check tenant setting
-- Drop existing staff update policy
DROP POLICY IF EXISTS shifts_update_policy_staff ON shifts;

-- Create new staff update policy that checks tenant setting
CREATE POLICY shifts_update_policy_staff ON shifts
    FOR UPDATE
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM tenant_settings
            WHERE tenant_settings.tenant_id = shifts.tenant_id
            AND tenant_settings.staff_can_accept_decline_shifts = true
        )
        -- Only allow status changes: published -> confirmed or published -> cancelled
        AND (
            (OLD.status = 'published' AND NEW.status IN ('confirmed', 'cancelled'))
            OR (OLD.status = NEW.status) -- Allow no status change (for other field updates if needed)
        )
    )
    WITH CHECK (
        public.user_has_membership(auth.uid(), tenant_id)
        AND staff_id IN (
            SELECT id FROM staff WHERE user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM tenant_settings
            WHERE tenant_settings.tenant_id = shifts.tenant_id
            AND tenant_settings.staff_can_accept_decline_shifts = true
        )
        -- Only allow status changes: published -> confirmed or published -> cancelled
        AND (
            (OLD.status = 'published' AND NEW.status IN ('confirmed', 'cancelled'))
            OR (OLD.status = NEW.status) -- Allow no status change (for other field updates if needed)
        )
    );

-- 7. Create function to initialize tenant settings for existing tenants
CREATE OR REPLACE FUNCTION initialize_tenant_settings()
RETURNS void AS $$
BEGIN
    INSERT INTO tenant_settings (tenant_id, timezone, staff_can_accept_decline_shifts)
    SELECT id, 'UTC', false
    FROM tenants
    WHERE id NOT IN (SELECT tenant_id FROM tenant_settings)
    ON CONFLICT (tenant_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Initialize settings for existing tenants
SELECT initialize_tenant_settings();

-- 8. Create trigger to auto-create tenant settings for new tenants
CREATE OR REPLACE FUNCTION create_tenant_settings_on_tenant_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tenant_settings (tenant_id, timezone, staff_can_accept_decline_shifts)
    VALUES (NEW.id, 'UTC', false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_tenant_settings
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_tenant_settings_on_tenant_insert();

-- 9. Add composite index for week view queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_shifts_tenant_week ON shifts(tenant_id, start_time)
WHERE start_time >= CURRENT_DATE - INTERVAL '30 days';

-- 10. Add index for availability queries
CREATE INDEX IF NOT EXISTS idx_availability_staff_day ON availability(staff_id, day_of_week);

