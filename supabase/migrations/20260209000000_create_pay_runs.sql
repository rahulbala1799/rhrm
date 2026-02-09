-- Pay Runs: header and line items for payroll cycles
-- See apps/web/app/(dashboard)/payroll/PAY_RUNS_DESIGN.md

-- pay_runs: one row per pay period run
CREATE TABLE pay_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'approved', 'finalised')),
  name TEXT NOT NULL,
  notes TEXT,
  total_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_gross_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
  staff_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  finalised_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  finalised_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, pay_period_start, pay_period_end)
);

-- pay_run_lines: one row per staff per run (snapshot)
CREATE TABLE pay_run_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id UUID NOT NULL REFERENCES pay_runs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  employee_number TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  regular_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  hourly_rate DECIMAL(10,2) NOT NULL,
  overtime_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  regular_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
  overtime_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
  adjustments DECIMAL(12,2) NOT NULL DEFAULT 0,
  adjustment_reason TEXT,
  gross_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'included' CHECK (status IN ('included', 'excluded')),
  timesheet_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- pay_run_changes: user-facing change log
CREATE TABLE pay_run_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id UUID NOT NULL REFERENCES pay_runs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pay_run_line_id UUID REFERENCES pay_run_lines(id) ON DELETE SET NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pay_runs_tenant_status ON pay_runs(tenant_id, status);
CREATE INDEX idx_pay_runs_period ON pay_runs(tenant_id, pay_period_start, pay_period_end);
CREATE INDEX idx_pay_runs_created_at ON pay_runs(tenant_id, created_at DESC);
CREATE INDEX idx_pay_run_lines_run ON pay_run_lines(pay_run_id);
CREATE INDEX idx_pay_run_lines_staff ON pay_run_lines(staff_id);
CREATE INDEX idx_pay_run_changes_run ON pay_run_changes(pay_run_id, created_at DESC);

-- updated_at trigger for pay_runs and pay_run_lines
CREATE TRIGGER pay_runs_updated_at
  BEFORE UPDATE ON pay_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER pay_run_lines_updated_at
  BEFORE UPDATE ON pay_run_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recalculate pay_runs totals when lines change
CREATE OR REPLACE FUNCTION recalculate_pay_run_totals()
RETURNS TRIGGER AS $$
DECLARE
  run_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    run_id := OLD.pay_run_id;
  ELSE
    run_id := NEW.pay_run_id;
  END IF;

  UPDATE pay_runs
  SET
    total_hours = COALESCE((
      SELECT SUM(total_hours) FROM pay_run_lines
      WHERE pay_run_id = run_id AND status = 'included'
    ), 0),
    total_gross_pay = COALESCE((
      SELECT SUM(gross_pay) FROM pay_run_lines
      WHERE pay_run_id = run_id AND status = 'included'
    ), 0),
    staff_count = (
      SELECT COUNT(*)::INTEGER FROM pay_run_lines
      WHERE pay_run_id = run_id AND status = 'included'
    ),
    updated_at = NOW()
  WHERE id = run_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalculate_pay_run_totals
  AFTER INSERT OR UPDATE OR DELETE ON pay_run_lines
  FOR EACH ROW EXECUTE FUNCTION recalculate_pay_run_totals();

-- RLS: pay_runs
ALTER TABLE pay_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY pay_runs_select_admin ON pay_runs
  FOR SELECT USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
CREATE POLICY pay_runs_select_manager ON pay_runs
  FOR SELECT USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager'));
CREATE POLICY pay_runs_select_superadmin ON pay_runs
  FOR SELECT USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin'));

CREATE POLICY pay_runs_insert_admin ON pay_runs
  FOR INSERT WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
CREATE POLICY pay_runs_insert_superadmin ON pay_runs
  FOR INSERT WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin'));

CREATE POLICY pay_runs_update_admin ON pay_runs
  FOR UPDATE USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'))
  WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
CREATE POLICY pay_runs_update_superadmin ON pay_runs
  FOR UPDATE USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin'))
  WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin'));

CREATE POLICY pay_runs_delete_admin ON pay_runs
  FOR DELETE USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
CREATE POLICY pay_runs_delete_superadmin ON pay_runs
  FOR DELETE USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin'));

-- RLS: pay_run_lines
ALTER TABLE pay_run_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY pay_run_lines_select_admin ON pay_run_lines
  FOR SELECT USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
CREATE POLICY pay_run_lines_select_manager ON pay_run_lines
  FOR SELECT USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager'));
CREATE POLICY pay_run_lines_select_superadmin ON pay_run_lines
  FOR SELECT USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin'));

CREATE POLICY pay_run_lines_insert_admin ON pay_run_lines
  FOR INSERT WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
CREATE POLICY pay_run_lines_insert_superadmin ON pay_run_lines
  FOR INSERT WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin'));

CREATE POLICY pay_run_lines_update_admin ON pay_run_lines
  FOR UPDATE USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'))
  WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
CREATE POLICY pay_run_lines_update_superadmin ON pay_run_lines
  FOR UPDATE USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin'))
  WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin'));

CREATE POLICY pay_run_lines_delete_admin ON pay_run_lines
  FOR DELETE USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
CREATE POLICY pay_run_lines_delete_superadmin ON pay_run_lines
  FOR DELETE USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin'));

-- RLS: pay_run_changes
ALTER TABLE pay_run_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY pay_run_changes_select_admin ON pay_run_changes
  FOR SELECT USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
CREATE POLICY pay_run_changes_select_manager ON pay_run_changes
  FOR SELECT USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager'));
CREATE POLICY pay_run_changes_select_superadmin ON pay_run_changes
  FOR SELECT USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin'));

CREATE POLICY pay_run_changes_insert_admin ON pay_run_changes
  FOR INSERT WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
CREATE POLICY pay_run_changes_insert_superadmin ON pay_run_changes
  FOR INSERT WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'superadmin'));
