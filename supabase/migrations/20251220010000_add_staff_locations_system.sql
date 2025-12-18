-- Staff Locations System Migration
-- Creates staff_locations junction table to support multiple locations per staff
-- Enables location filtering in shift creation modal

-- 1. Create staff_locations junction table
CREATE TABLE IF NOT EXISTS staff_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id),
    UNIQUE(tenant_id, staff_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_location_id ON staff_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_tenant_id ON staff_locations(tenant_id);

-- 2. Migrate existing location_id from staff table to staff_locations
-- Only migrate if staff has a location_id and it doesn't already exist in staff_locations
INSERT INTO staff_locations (tenant_id, staff_id, location_id, assigned_at)
SELECT 
    tenant_id,
    id as staff_id,
    location_id,
    created_at as assigned_at
FROM staff
WHERE location_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM staff_locations 
    WHERE staff_locations.staff_id = staff.id 
    AND staff_locations.location_id = staff.location_id
);

-- 3. Enable RLS
ALTER TABLE staff_locations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for staff_locations
CREATE POLICY "Users can view staff locations in their tenant"
ON staff_locations FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM memberships 
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

CREATE POLICY "Admins and Managers can manage staff locations"
ON staff_locations FOR ALL
USING (
    tenant_id IN (
        SELECT tenant_id FROM memberships 
        WHERE user_id = auth.uid() 
        AND status = 'active'
        AND role IN ('admin', 'manager')
    )
);

