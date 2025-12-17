-- Add missing staff columns (if migration was partially applied)
-- This migration is idempotent and safe to run multiple times

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

-- Create staff_status_history table if it doesn't exist
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_staff_manager_id ON staff(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_status_history_tenant_staff ON staff_status_history(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_status_history_staff_id ON staff_status_history(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_status_history_effective_date ON staff_status_history(effective_date);

-- Update RLS policies for staff table (only if policy doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'staff' 
        AND policyname = 'staff_select_policy_staff'
    ) THEN
        CREATE POLICY staff_select_policy_staff ON staff
            FOR SELECT
            USING (
                public.user_has_membership(auth.uid(), tenant_id)
                AND user_id = auth.uid()
            );
    END IF;
END $$;

-- RLS policies for staff_status_history table
ALTER TABLE staff_status_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS staff_status_history_select_admin ON staff_status_history;
DROP POLICY IF EXISTS staff_status_history_select_manager ON staff_status_history;
DROP POLICY IF EXISTS staff_status_history_select_superadmin ON staff_status_history;
DROP POLICY IF EXISTS staff_status_history_insert_admin ON staff_status_history;
DROP POLICY IF EXISTS staff_status_history_insert_manager ON staff_status_history;
DROP POLICY IF EXISTS staff_status_history_insert_superadmin ON staff_status_history;

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

