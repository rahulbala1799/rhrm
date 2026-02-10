# Contract Generator: Migrations Checklist

This document lists all database (and storage) migrations that may be needed to implement the Contract Generator as specified in [README.md](./README.md). Tables and columns are derived from §4.5, §5, and §6.7.

**Existing references:** `tenants`, `staff`, `job_roles` (and `staff_roles`), `profiles` already exist. Compliance storage uses bucket `compliance-documents`; contract signed uploads may use the same bucket or a dedicated one.

---

## 1. Clause library (clause-level content)

### 1.1 `contract_clauses`

Stores discrete, versioned clauses with tags. Used by clause packs and templates.

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK, default gen_random_uuid() |
| clause_key | TEXT | e.g. `commencement_ie`, `statutory_override_ie`; unique per jurisdiction + version |
| jurisdiction | TEXT NOT NULL | e.g. `IE` |
| version | TEXT NOT NULL | e.g. `1`, `1.1` |
| tag | TEXT NOT NULL | `legal_required` \| `best_practice` \| `company_policy` \| `statutory_override` (special) |
| body | TEXT NOT NULL | Clause text with placeholders (e.g. `{{employment.start_date}}`) |
| is_locked | BOOLEAN NOT NULL DEFAULT false | For statutory override clause |
| affected_by_law_change | BOOLEAN NOT NULL DEFAULT false | §5.17 future-law readiness |
| law_change_notes | TEXT | Optional; review due date or reference |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

- **Unique:** `(clause_key, jurisdiction, version)`.
- **Indexes:** `(jurisdiction)`, `(jurisdiction, tag)`, `(affected_by_law_change)` where true.
- **RLS:** By jurisdiction / tenant if clauses are tenant-specific; if global, read for all tenant members.
- **Note:** May be global (seed) or tenant-overridable; document decision.

### 1.2 `contract_packs`

Logical groups of clauses (e.g. `core_required_ie`, `hours_variable_unpredictable`). Templates reference packs, not raw clauses.

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| pack_key | TEXT NOT NULL | e.g. `core_required_ie`, `contract_type_fixed_term` |
| jurisdiction | TEXT NOT NULL | e.g. `IE` |
| clause_keys | TEXT[] NOT NULL | Ordered list of clause_key (or clause_key@version) |
| description | TEXT | For admin UI |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

- **Unique:** `(pack_key, jurisdiction)` (if one row per pack per jurisdiction).
- **Indexes:** `(jurisdiction)`.
- **RLS:** Same as clauses (global read vs tenant-scoped).

---

## 2. Templates and role mapping

### 2.1 `contract_templates`

Template metadata and which packs are enabled. Version frozen when a contract is issued (§5.3).

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| tenant_id | UUID NOT NULL | REFERENCES tenants(id) ON DELETE CASCADE |
| template_id | TEXT NOT NULL | e.g. `IE_CONTRACT_V1`, `IE_PERM_FT_FIXED` |
| name | TEXT NOT NULL | Display name |
| jurisdiction | TEXT NOT NULL | e.g. `IE` |
| version | TEXT NOT NULL | Semantic version; frozen once used in an assignment |
| packs_enabled | TEXT[] NOT NULL | List of pack_key included in this template |
| generator_schema | JSONB | Required/optional fields, toggles, validation rules |
| body_or_clause_refs | TEXT/JSONB | Optional; if not fully pack-driven, legacy body or clause ordering |
| is_standard | BOOLEAN NOT NULL DEFAULT false | True for shipped IE standard templates (locked defaults) |
| affected_by_law_change | BOOLEAN NOT NULL DEFAULT false | §5.17 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

- **Unique:** `(tenant_id, template_id, version)`.
- **Indexes:** `(tenant_id)`, `(tenant_id, jurisdiction)`, `(tenant_id, is_standard)`.
- **RLS:** Tenant-scoped; admins/managers manage, staff read only if needed for “my contract” view.

### 2.2 `contract_templates_roles` (template ↔ role link)

Which job roles use which template (for “recommended template” and role-based default).

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| tenant_id | UUID NOT NULL | REFERENCES tenants(id) ON DELETE CASCADE |
| template_id | UUID NOT NULL | REFERENCES contract_templates(id) ON DELETE CASCADE (or template_id string + version – see 6.7) |
| job_role_id | UUID NOT NULL | REFERENCES job_roles(id) ON DELETE CASCADE |
| is_default | BOOLEAN NOT NULL DEFAULT true | This role’s default template for assignment |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

- **Unique:** `(tenant_id, job_role_id)` if one default template per role; or allow multiple with is_default flag.
- **Indexes:** `(tenant_id)`, `(job_role_id)`.
- **RLS:** Tenant-scoped.

**Alternative (per §6.7):** `role_contract_defaults(role_id, template_id)` – one row per role, template_id references contract_templates. Same idea; migration can implement either shape.

---

## 3. Company defaults and assignment data

### 3.1 `company_contract_defaults`

One-time company setup: probation, sick pay, notice, Sunday premium, breaks, pension, handbook refs (§6.3 Step 2).

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| tenant_id | UUID NOT NULL UNIQUE | REFERENCES tenants(id) ON DELETE CASCADE; one row per tenant |
| defaults_json | JSONB NOT NULL | e.g. { probation_length_weeks, probation_notice, break_policy, sunday_premium_method, sick_policy, pension_status, notice_approach, handbook_refs: { disciplinary, grievance, privacy_notice, safety_statement } } |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| updated_by | UUID | REFERENCES profiles(id) |

- **Indexes:** `(tenant_id)` (unique already gives this).
- **RLS:** Tenant-scoped; admin/manager write, others read if needed.

### 3.2 `contract_assignments`

Per-employee contract instance: issued document, status, immutable generation data, audit (§4.5, §5.10, §5.11, §5.16).

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| tenant_id | UUID NOT NULL | REFERENCES tenants(id) ON DELETE CASCADE |
| staff_id | UUID NOT NULL | REFERENCES staff(id) ON DELETE CASCADE; the employee |
| template_id | UUID NOT NULL | REFERENCES contract_templates(id) (or template_id string) |
| template_version | TEXT NOT NULL | Frozen at issue; matches contract_templates.version |
| status | TEXT NOT NULL | `issued` \| `viewed` \| `signed` \| `uploaded` \| `admin_verified` (§5.11) |
| generation_input_json | JSONB NOT NULL | Exact input used to generate; immutable after issue |
| rendered_output_storage_path | TEXT | Path in storage for generated PDF (immutable) |
| signed_upload_storage_path | TEXT | Path in storage for signed copy (nullable until uploaded) |
| created_at | TIMESTAMPTZ | |
| issued_at | TIMESTAMPTZ | When contract was issued to employee |
| viewed_at | TIMESTAMPTZ | Optional |
| signed_at | TIMESTAMPTZ | Optional |
| uploaded_at | TIMESTAMPTZ | When signed copy was uploaded |
| admin_verified_at | TIMESTAMPTZ | When admin verified signed copy |
| created_by | UUID | REFERENCES profiles(id); who created the assignment |
| issued_by | UUID | REFERENCES profiles(id); who issued it |
| admin_verified_by | UUID | REFERENCES profiles(id); who verified signed copy |

- **Indexes:** `(tenant_id)`, `(staff_id)`, `(tenant_id, status)`, `(tenant_id, issued_at DESC)`.
- **RLS:** Tenant-scoped; staff can read/update own row for view/sign/upload; admin/manager full access.
- **Immutability:** Application (or trigger) must prevent updates to `generation_input_json`, `rendered_output_storage_path`, and `template_version` after `issued_at` is set.

---

## 4. Storage

### 4.1 Bucket for contract outputs and signed uploads

- **Option A:** Reuse existing `compliance-documents` bucket; prefix paths by e.g. `contracts/{assignment_id}/generated.pdf` and `contracts/{assignment_id}/signed.pdf`.
- **Option B:** New bucket e.g. `contract-documents` (or `contracts`) with policies:
  - Admins/managers: read/write for tenant’s contracts.
  - Staff: read own generated contract; write (upload) own signed copy only under assigned path.

Migration: either document “use existing bucket + path convention” or add a migration that creates the new bucket and RLS/storage policies.

### 4.2 Path convention (if using existing bucket)

- `contracts/{tenant_id}/{assignment_id}/generated.pdf` – rendered contract (generated once).
- `contracts/{tenant_id}/{assignment_id}/signed.pdf` (or signed filename) – uploaded signed copy.

---

## 5. Optional / future migrations

### 5.1 Contract audit log (optional)

If a separate audit table is preferred over only columns on `contract_assignments`:

- **contract_assignment_audit:** id, assignment_id, action (created \| issued \| viewed \| signed \| uploaded \| admin_verified \| voided), actor_id (profiles), created_at, metadata (JSONB).

Useful for strict “who did what when” without scanning assignment timestamps.

### 5.2 Law-change flags on templates/clauses

Already included as columns above:

- `contract_clauses.affected_by_law_change`, `law_change_notes`
- `contract_templates.affected_by_law_change`

No extra migration if these are in the initial clause/template tables.

### 5.3 Lay-off / short-time acknowledgment

No separate table required if stored as a flag in `generation_input_json` (e.g. `layoff_shorttime_acknowledged: true`). If you want an explicit audit row: optional table `contract_layoff_acknowledgments(assignment_id, acknowledged_by, acknowledged_at)`.

---

## 6. Migration order (suggested)

1. **contract_clauses** – base clause content (can be seeded from app or a seed migration).
2. **contract_packs** – pack definitions and clause_keys; seed for IE standard packs.
3. **contract_templates** – tenant templates; seed standard IE templates (optional) or create via app.
4. **contract_templates_roles** (or **role_contract_defaults**) – link roles to default template.
5. **company_contract_defaults** – one row per tenant when they complete company setup.
6. **contract_assignments** – per-employee contract instances.
7. **Storage** – bucket or path convention + policies (if new bucket).
8. **RLS** – ensure all new tables have RLS and tenant-scoped (or appropriate) policies.
9. **Triggers** – `updated_at` on all new tables; optional trigger to prevent mutation of `contract_assignments.generation_input_json` / `rendered_output_storage_path` after issue.

---

## 7. Summary checklist

| Item | Migration / action |
|------|--------------------|
| contract_clauses table | New table; indexes; RLS; optional seed |
| contract_packs table | New table; indexes; RLS; optional seed |
| contract_templates table | New table; indexes; RLS |
| contract_templates_roles (or role_contract_defaults) | New table; FK to job_roles, contract_templates; RLS |
| company_contract_defaults table | New table; unique tenant_id; RLS |
| contract_assignments table | New table; FKs staff, contract_templates, profiles; indexes; RLS; immutability rule |
| Storage bucket or path convention | Use compliance-documents + paths or new bucket + policies |
| updated_at triggers | On contract_clauses, contract_packs, contract_templates, contract_templates_roles, company_contract_defaults; contract_assignments usually no updated_at for immutable fields |
| Audit columns | created_by, issued_by, admin_verified_by, *_at on contract_assignments |

Once these migrations are in place, the app can implement the Contract Generator flows described in the README (§4, §5, §6) without further schema changes for the core flow. Optional add-ons (manager pack, cash handling, etc.) can be implemented with clause/pack content and generator_schema only, unless new assignment-level fields are required.
