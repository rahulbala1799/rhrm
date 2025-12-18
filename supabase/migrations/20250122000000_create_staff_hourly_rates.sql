-- Create staff_hourly_rates table
CREATE TABLE IF NOT EXISTS staff_hourly_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hourly_rate DECIMAL(10, 2) NOT NULL CHECK (hourly_rate >= 0),
  effective_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  CONSTRAINT unique_staff_effective_date UNIQUE (staff_id, effective_date)
);

-- Indexes
CREATE INDEX idx_staff_hourly_rates_staff_id ON staff_hourly_rates(staff_id);
CREATE INDEX idx_staff_hourly_rates_effective_date ON staff_hourly_rates(effective_date);
CREATE INDEX idx_staff_hourly_rates_tenant_id ON staff_hourly_rates(tenant_id);
CREATE INDEX idx_staff_hourly_rates_lookup ON staff_hourly_rates(staff_id, effective_date DESC);
CREATE INDEX idx_staff_hourly_rates_range ON staff_hourly_rates(staff_id, effective_date);

-- RLS
ALTER TABLE staff_hourly_rates ENABLE ROW LEVEL SECURITY;

-- Policies (Admin/Superadmin ONLY)
CREATE POLICY "Admins can view rate history in tenant"
  ON staff_hourly_rates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = staff_hourly_rates.tenant_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'superadmin')
      AND memberships.status = 'active'
    )
  );

CREATE POLICY "Admins can insert rate history"
  ON staff_hourly_rates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = staff_hourly_rates.tenant_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'superadmin')
      AND memberships.status = 'active'
    )
  );

CREATE POLICY "Admins can update future rates"
  ON staff_hourly_rates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = staff_hourly_rates.tenant_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'superadmin')
      AND memberships.status = 'active'
    )
    AND effective_date > CURRENT_DATE
  );

CREATE POLICY "Admins can delete future rates"
  ON staff_hourly_rates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = staff_hourly_rates.tenant_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'superadmin')
      AND memberships.status = 'active'
    )
    AND effective_date > CURRENT_DATE
  );

-- Tenant integrity trigger
CREATE OR REPLACE FUNCTION enforce_rate_tenant_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id = NEW.staff_id
    AND staff.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Rate tenant_id must match staff tenant_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_rate_tenant_integrity
  BEFORE INSERT OR UPDATE ON staff_hourly_rates
  FOR EACH ROW
  EXECUTE FUNCTION enforce_rate_tenant_integrity();

-- Updated_at trigger
CREATE TRIGGER update_staff_hourly_rates_updated_at
  BEFORE UPDATE ON staff_hourly_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sync trigger (canonical version - handles INSERT, UPDATE, DELETE)
CREATE OR REPLACE FUNCTION sync_staff_hourly_rate()
RETURNS TRIGGER AS $$
DECLARE
  target_staff_id UUID;
  latest_rate DECIMAL(10,2);
BEGIN
  -- Determine staff_id based on trigger operation
  IF TG_OP = 'DELETE' THEN
    target_staff_id := OLD.staff_id;
  ELSE
    target_staff_id := NEW.staff_id;
  END IF;
  
  -- Get latest rate (returns NULL if no rates exist)
  SELECT hourly_rate INTO latest_rate
  FROM staff_hourly_rates
  WHERE staff_id = target_staff_id
  ORDER BY effective_date DESC
  LIMIT 1;
  
  -- Update staff with latest rate (even if NULL - handles deletion case)
  UPDATE staff
  SET hourly_rate = latest_rate
  WHERE id = target_staff_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Single trigger for all operations (INSERT, UPDATE, DELETE)
CREATE TRIGGER sync_staff_rate_on_rate_change
  AFTER INSERT OR UPDATE OR DELETE ON staff_hourly_rates
  FOR EACH ROW
  EXECUTE FUNCTION sync_staff_hourly_rate();

