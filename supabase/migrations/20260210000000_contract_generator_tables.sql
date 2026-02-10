-- Contract Generator: clause library, packs, templates, role mapping, company defaults, assignments
-- See apps/web/app/(dashboard)/compliance/contract/CONTRACT_MIGRATIONS.md

-- =============================================================================
-- 1. CLAUSE LIBRARY (global seed data; no tenant_id)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contract_clauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clause_key TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    version TEXT NOT NULL,
    tag TEXT NOT NULL CHECK (tag IN ('legal_required', 'best_practice', 'company_policy', 'statutory_override')),
    body TEXT NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    affected_by_law_change BOOLEAN NOT NULL DEFAULT false,
    law_change_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(clause_key, jurisdiction, version)
);

CREATE INDEX IF NOT EXISTS idx_contract_clauses_jurisdiction ON contract_clauses(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_contract_clauses_jurisdiction_tag ON contract_clauses(jurisdiction, tag);
CREATE INDEX IF NOT EXISTS idx_contract_clauses_law_change ON contract_clauses(affected_by_law_change) WHERE affected_by_law_change = true;

COMMENT ON TABLE contract_clauses IS 'Versioned clause text with placeholders; used by contract packs. Global (no tenant).';

-- =============================================================================
-- 2. CONTRACT PACKS (global; groups of clause_keys)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contract_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_key TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    clause_keys TEXT[] NOT NULL DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(pack_key, jurisdiction)
);

CREATE INDEX IF NOT EXISTS idx_contract_packs_jurisdiction ON contract_packs(jurisdiction);

COMMENT ON TABLE contract_packs IS 'Logical groups of clauses; templates reference packs. Global (no tenant).';

-- =============================================================================
-- 3. CONTRACT TEMPLATES (per tenant)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    name TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    version TEXT NOT NULL,
    packs_enabled TEXT[] NOT NULL DEFAULT '{}',
    generator_schema JSONB DEFAULT '{}',
    body_or_clause_refs JSONB,
    is_standard BOOLEAN NOT NULL DEFAULT false,
    affected_by_law_change BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, template_id, version)
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_tenant ON contract_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_tenant_jurisdiction ON contract_templates(tenant_id, jurisdiction);
CREATE INDEX IF NOT EXISTS idx_contract_templates_tenant_standard ON contract_templates(tenant_id, is_standard) WHERE is_standard = true;

COMMENT ON TABLE contract_templates IS 'Template metadata and enabled packs; version frozen when assignment is issued.';

-- =============================================================================
-- 4. TEMPLATE ↔ ROLE (default template per job role)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contract_templates_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
    job_role_id UUID NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
    is_default BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, job_role_id)
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_roles_tenant ON contract_templates_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_roles_job_role ON contract_templates_roles(job_role_id);

-- =============================================================================
-- 5. COMPANY CONTRACT DEFAULTS (one row per tenant)
-- =============================================================================

CREATE TABLE IF NOT EXISTS company_contract_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    defaults_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

COMMENT ON TABLE company_contract_defaults IS 'One-time company setup: probation, sick, pension, notice, handbook refs.';

-- =============================================================================
-- 6. CONTRACT ASSIGNMENTS (per-employee contract instance)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contract_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE RESTRICT,
    template_version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'viewed', 'signed', 'uploaded', 'admin_verified')),
    generation_input_json JSONB NOT NULL,
    rendered_output_storage_path TEXT,
    signed_upload_storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    issued_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ,
    admin_verified_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    issued_by UUID REFERENCES profiles(id),
    admin_verified_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_contract_assignments_tenant ON contract_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_assignments_staff ON contract_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_contract_assignments_tenant_status ON contract_assignments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contract_assignments_tenant_issued ON contract_assignments(tenant_id, issued_at DESC NULLS LAST);

COMMENT ON TABLE contract_assignments IS 'Per-employee contract instance; generation data immutable after issue.';

-- =============================================================================
-- 7. UPDATED_AT TRIGGERS
-- =============================================================================

CREATE TRIGGER update_contract_clauses_updated_at
    BEFORE UPDATE ON contract_clauses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_packs_updated_at
    BEFORE UPDATE ON contract_packs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_templates_updated_at
    BEFORE UPDATE ON contract_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_templates_roles_updated_at
    BEFORE UPDATE ON contract_templates_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_contract_defaults_updated_at
    BEFORE UPDATE ON company_contract_defaults FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 8. RLS (contract_clauses and contract_packs: readable by any authenticated user for IE)
-- =============================================================================

ALTER TABLE contract_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_contract_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_assignments ENABLE ROW LEVEL SECURITY;

-- Clauses and packs: read for anyone authenticated (used when generating)
CREATE POLICY contract_clauses_select_all ON contract_clauses FOR SELECT TO authenticated USING (true);
CREATE POLICY contract_packs_select_all ON contract_packs FOR SELECT TO authenticated USING (true);

-- Templates: tenant-scoped; admin/manager manage
CREATE POLICY contract_templates_select ON contract_templates FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY contract_templates_insert ON contract_templates FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'manager')));

CREATE POLICY contract_templates_update ON contract_templates FOR UPDATE
    USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'manager')));

CREATE POLICY contract_templates_delete ON contract_templates FOR DELETE
    USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'manager')));

-- Template-role link: same as templates
CREATE POLICY contract_templates_roles_select ON contract_templates_roles FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY contract_templates_roles_insert ON contract_templates_roles FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'manager')));

CREATE POLICY contract_templates_roles_update ON contract_templates_roles FOR UPDATE
    USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'manager')));

CREATE POLICY contract_templates_roles_delete ON contract_templates_roles FOR DELETE
    USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'manager')));

-- Company defaults: tenant-scoped; admin/manager write
CREATE POLICY company_contract_defaults_select ON company_contract_defaults FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY company_contract_defaults_insert ON company_contract_defaults FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'manager')));

CREATE POLICY company_contract_defaults_update ON company_contract_defaults FOR UPDATE
    USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'manager')));

-- Assignments: staff see own; admin/manager see all in tenant
CREATE POLICY contract_assignments_select ON contract_assignments FOR SELECT
    USING (
        tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active')
        AND (
            staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid())
            OR EXISTS (SELECT 1 FROM memberships m WHERE m.tenant_id = contract_assignments.tenant_id AND m.user_id = auth.uid() AND m.status = 'active' AND m.role IN ('admin', 'manager'))
        )
    );

CREATE POLICY contract_assignments_insert ON contract_assignments FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'manager')));

CREATE POLICY contract_assignments_update ON contract_assignments FOR UPDATE
    USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'));
