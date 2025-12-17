-- Staff Detail System Migration
-- Adds new fields to staff table and creates staff_status_history table

-- Add staff-entered fields (self-service)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address_line_1 TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address_line_2 TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS postcode TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- Add admin-entered fields (HR configuration)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pay_type TEXT CHECK (pay_type IN ('hourly', 'salary'));
ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary_amount DECIMAL(10, 2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS pay_frequency TEXT CHECK (pay_frequency IN ('weekly', 'fortnightly', 'monthly'));
ALTER TABLE staff ADD COLUMN IF NOT EXISTS overtime_enabled BOOLEAN DEFAULT false;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS overtime_rule_type TEXT CHECK (overtime_rule_type IN ('multiplier', 'flat_extra'));
ALTER TABLE staff ADD COLUMN IF NOT EXISTS overtime_multiplier DECIMAL(4, 2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS overtime_flat_extra DECIMAL(10, 2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS contracted_weekly_hours DECIMAL(5, 2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS min_hours_per_week DECIMAL(5, 2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS max_hours_per_week DECIMAL(5, 2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS max_hours_per_day DECIMAL(5, 2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS max_consecutive_days INTEGER;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS min_rest_hours_between_shifts DECIMAL(4, 2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS preferred_working_days INTEGER[];
ALTER TABLE staff ADD COLUMN IF NOT EXISTS preferred_shift_types TEXT[];

-- Create staff_status_history table
CREATE TABLE IF NOT EXISTS staff_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    old_status TEXT CHECK (old_status IN ('active', 'on_leave', 'terminated')),
    new_status TEXT NOT NULL CHECK (new_status IN ('active', 'on_leave', 'terminated')),
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    changed_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_manager_id ON staff(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_status_history_tenant_staff ON staff_status_history(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_status_history_staff_id ON staff_status_history(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_status_history_effective_date ON staff_status_history(effective_date);

-- Update RLS policies for staff table
-- Drop existing staff SELECT policy for staff role (we'll recreate it more restrictively)
DROP POLICY IF EXISTS staff_select_policy_staff ON staff;

-- Recreate staff SELECT policy: staff can only SELECT their own record
CREATE POLICY staff_select_policy_staff ON staff
    FOR SELECT
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
        AND user_id = auth.uid()
    );

-- Staff UPDATE policy already exists and is correct (only own record)
-- No changes needed to staff_update_policy_staff

-- RLS policies for staff_status_history table
ALTER TABLE staff_status_history ENABLE ROW LEVEL SECURITY;

-- Admin/Manager can view status history for staff in their tenant
CREATE POLICY staff_status_history_select_admin ON staff_status_history
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY staff_status_history_select_manager ON staff_status_history
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY staff_status_history_select_superadmin ON staff_status_history
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin')
    );

-- Only admin/manager/superadmin can insert status history (via API)
CREATE POLICY staff_status_history_insert_admin ON staff_status_history
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

CREATE POLICY staff_status_history_insert_manager ON staff_status_history
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

CREATE POLICY staff_status_history_insert_superadmin ON staff_status_history
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin')
    );

-- Comments for documentation
COMMENT ON COLUMN staff.preferred_name IS 'Staff-entered preferred name';
COMMENT ON COLUMN staff.address_line_1 IS 'Staff-entered address line 1';
COMMENT ON COLUMN staff.address_line_2 IS 'Staff-entered address line 2';
COMMENT ON COLUMN staff.city IS 'Staff-entered city';
COMMENT ON COLUMN staff.postcode IS 'Staff-entered postcode';
COMMENT ON COLUMN staff.country IS 'Staff-entered country';
COMMENT ON COLUMN staff.emergency_contact_name IS 'Staff-entered emergency contact name';
COMMENT ON COLUMN staff.emergency_contact_relationship IS 'Staff-entered emergency contact relationship';
COMMENT ON COLUMN staff.emergency_contact_phone IS 'Staff-entered emergency contact phone';
COMMENT ON COLUMN staff.job_title IS 'Admin-entered job title';
COMMENT ON COLUMN staff.department IS 'Admin-entered department/team';
COMMENT ON COLUMN staff.manager_id IS 'Admin-entered manager reference (self-reference to staff table)';
COMMENT ON COLUMN staff.pay_type IS 'Admin-entered pay type: hourly or salary';
COMMENT ON COLUMN staff.salary_amount IS 'Admin-entered salary amount (when pay_type is salary)';
COMMENT ON COLUMN staff.pay_frequency IS 'Admin-entered pay frequency: weekly, fortnightly, or monthly';
COMMENT ON COLUMN staff.overtime_enabled IS 'Admin-entered overtime enabled flag';
COMMENT ON COLUMN staff.overtime_rule_type IS 'Admin-entered overtime rule type: multiplier or flat_extra';
COMMENT ON COLUMN staff.overtime_multiplier IS 'Admin-entered overtime multiplier (when rule_type is multiplier)';
COMMENT ON COLUMN staff.overtime_flat_extra IS 'Admin-entered overtime flat extra amount (when rule_type is flat_extra)';
COMMENT ON COLUMN staff.contracted_weekly_hours IS 'Admin-entered contracted weekly hours';
COMMENT ON COLUMN staff.min_hours_per_week IS 'Admin-entered minimum hours per week';
COMMENT ON COLUMN staff.max_hours_per_week IS 'Admin-entered maximum hours per week';
COMMENT ON COLUMN staff.max_hours_per_day IS 'Admin-entered maximum hours per day';
COMMENT ON COLUMN staff.max_consecutive_days IS 'Admin-entered maximum consecutive days';
COMMENT ON COLUMN staff.min_rest_hours_between_shifts IS 'Admin-entered minimum rest hours between shifts';
COMMENT ON COLUMN staff.preferred_working_days IS 'Admin-entered preferred working days array (0-6 for Sun-Sat)';
COMMENT ON COLUMN staff.preferred_shift_types IS 'Admin-entered preferred shift types array (morning, evening, night)';
COMMENT ON TABLE staff_status_history IS 'Audit trail of staff status changes for compliance and accountability';

