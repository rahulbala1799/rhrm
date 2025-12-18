-- Job Roles System Migration
-- Creates job_roles table, staff_roles junction table, and adds role_id to shifts
-- Enables role-based color coding for shifts in scheduler

-- 1. Create job_roles table
CREATE TABLE IF NOT EXISTS job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    bg_color TEXT NOT NULL DEFAULT '#E5E7EB',
    text_color TEXT NOT NULL DEFAULT '#1F2937',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index for case-insensitive name per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_roles_tenant_name_unique 
ON job_roles(tenant_id, LOWER(name));

CREATE INDEX IF NOT EXISTS idx_job_roles_tenant_id ON job_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_roles_is_active ON job_roles(tenant_id, is_active) WHERE is_active = true;

-- 2. Create staff_roles junction table
CREATE TABLE IF NOT EXISTS staff_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id),
    UNIQUE(tenant_id, staff_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_roles_staff_id ON staff_roles(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_roles_role_id ON staff_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_staff_roles_tenant_id ON staff_roles(tenant_id);

-- 3. Add role_id to shifts table
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES job_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shifts_role_id ON shifts(role_id);

-- 4. Enable RLS
ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for job_roles
CREATE POLICY "Users can view active job roles in their tenant"
ON job_roles FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM memberships 
        WHERE user_id = auth.uid() AND status = 'active'
    )
    AND is_active = true
);

CREATE POLICY "Admins and Managers can manage job roles"
ON job_roles FOR ALL
USING (
    tenant_id IN (
        SELECT tenant_id FROM memberships 
        WHERE user_id = auth.uid() 
        AND status = 'active'
        AND role IN ('admin', 'manager')
    )
);

-- 6. RLS Policies for staff_roles
CREATE POLICY "Users can view staff roles in their tenant"
ON staff_roles FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM memberships 
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

CREATE POLICY "Admins and Managers can manage staff roles"
ON staff_roles FOR ALL
USING (
    tenant_id IN (
        SELECT tenant_id FROM memberships 
        WHERE user_id = auth.uid() 
        AND status = 'active'
        AND role IN ('admin', 'manager')
    )
);

-- 7. Add updated_at trigger for job_roles
CREATE TRIGGER update_job_roles_updated_at
BEFORE UPDATE ON job_roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

