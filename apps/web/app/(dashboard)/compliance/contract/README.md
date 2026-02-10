# Contract Section: Irish Employment Contracts & Generator

This document describes (1) Irish employment contract law requirements, (2) the generator-ready contract template, (3) the generator data mapping, (4) how the Contract Generator system is designed to work end-to-end, (5) generator and compliance requirements (clause tagging, statutory override, version locking, handbook separation, UI behaviour, defaults, clause library, immutability, status model, jurisdiction, safeguards, audit trail, and future-law readiness), and (6) the standard Irish template set and SME/retail flow (minimal templates, clause packs, company defaults, role mapping, assignment, editing rules, and data model).

**Reference:** *Irish_Employment_Contract_Law_Report.pdf* (practical compliance guide for small employers / retail and SMEs; not legal advice).

**Migrations:** A checklist of database and storage migrations needed for the Contract Generator is in [CONTRACT_MIGRATIONS.md](./CONTRACT_MIGRATIONS.md).

---

## 1. Irish Employment Contract Law (Summary)

### 1.1 What the law requires

- **Written terms** must be provided. Some core details within **5 days** of starting (“Day 5 statement”), and a **full written statement within 1 month**.
- Best practice: provide a single, signed contract that meets the 1-month requirements from day one, and reference a Staff Handbook for procedures.

### 1.2 Core terms (Day 5 statement)

- Names of employer and employee
- Employer’s address in Ireland
- Place of work (or statement that work is at various locations / no fixed place)
- Job title or brief description of role and duties
- Start date
- Probation (if any): length and conditions
- Contract type and duration (if fixed-term/temporary): expected duration or end date
- Pay: amount, frequency, and components (commission, bonuses, allowances)
- Hours: hours per day/week the employer reasonably expects; overtime terms if relevant
- Sunday work and tips/service charges (if applicable): Sunday premium; tips policy

### 1.3 Full written terms (within 1 month)

All of the above, plus:

- Paid leave (annual leave and public holidays)
- Sick leave (statutory sick pay and any company sick pay scheme)
- Pension (scheme details or PRSA facilitation)
- Notice periods (employee and employer)
- Collective agreements / sectoral orders (if any)
- Training entitlements (where employer must provide training)
- For unpredictable schedules: reference hours/days, minimum notice for shifts, cancellation rules, any guaranteed hours

### 1.4 Contract types

| Type        | Notes |
|------------|--------|
| **Permanent** | No fixed end date; clear hours, pay, place of work, notice. Part-time permanent: pro-rata benefits, no less favourable treatment except on objective grounds. |
| **Fixed-term** | State end date or ending event; state if early termination is allowed and on what notice; avoid repeated renewals without objective reasons (can convert to open-ended). |
| **Part-time** | Weekly hours (or range), days/rota, how extra hours are offered; comparable pay and conditions, pro-rata entitlements. |
| **Casual / zero-hours** | Describe clearly; Irish law restricts zero-hours that require availability without guaranteed work. Unpredictable roles: reference hours/days, scheduling notice, cancellation rules. |

### 1.5 Probation

- Clear and time-limited (commonly up to 6 months).
- Extensions only in exceptional circumstances, confirmed in writing before original end date.
- Specify notice during probation (e.g. 1 week), subject to statutory minimums.
- Dismissals during probation must not be discriminatory and should follow basic fair procedure.

### 1.6 Working time (retail-focused)

- Normal hours per day/week and how rosters are communicated.
- Rest and breaks per statute; break policy (paid/unpaid).
- Overtime: whether required, how approved, how paid/compensated.
- Sunday premium: if Sunday working is required, state how it is compensated.
- Unpredictable schedules: reference days/hours, minimum notice for shifts and cancellations.

### 1.7 Pay, deductions, benefits

- Pay rate/salary, frequency, all components (basic, commission, allowances, bonuses).
- Overtime and premium pay (Sundays, public holidays) and how calculated.
- Lawful deductions clause (e.g. overpayments, authorised deductions).
- Benefits (discount, uniform, expenses, pension, bonus): state if discretionary.

### 1.8 Leave

- Annual leave (statutory minimum, leave year, approval, carry-over).
- Public holidays (entitlement and compensation when working).
- Sick leave (reporting, certification, statutory sick pay, company scheme).
- Family leave (maternity, paternity, parent’s, parental, adoptive, carer’s, force majeure) – can reference handbook.

### 1.9 Disciplinary and grievance

- Written procedures strongly recommended.
- Disciplinary: investigation, meeting, right to respond, representation (colleague/union rep), outcome, appeal.
- Grievance: escalation route, timelines, confidentiality.
- Gross misconduct: define examples, reserve summary dismissal where appropriate.

### 1.10 Termination and notice

- **Statutory minimum employer notice (summary):** 13 weeks–<2 years: 1 week; 2–<5 years: 2 weeks; 5–<10 years: 4 weeks; 10–<15 years: 6 weeks; 15+ years: 8 weeks.
- Contract to state employee resignation notice and employer notice (at least statutory; may add contractual notice).
- Optional: pay in lieu of notice (PILON), garden leave, redundancy clause, lay-off/short-time where relevant.

### 1.11 Other common clauses

- Confidentiality and protection of business information
- Data protection and reference to Employee Privacy Notice
- Company property (return on termination; lawful deductions for unreturned items)
- Conflict of interest / secondary employment (restrict only on objective grounds)
- Policies/handbook incorporation; health and safety (Safety Statement)

### 1.12 Official sources

- Workplace Relations Commission (WRC)
- Citizens Information
- Irish Statute Book (Terms of Employment (Information) Acts; Organisation of Working Time Act 1997; Minimum Notice and Terms of Employment Act 1973; Protection of Employees (Part-Time Work) Act 2001; Protection of Employees (Fixed-Term Work) Act 2003; Sick Leave Act 2022; Employment (Miscellaneous Provisions) Act 2018)

---

## 2. Irish Employment Contract Template (Generator-Ready)

**Template ID:** `IE_CONTRACT_V1`  
**Jurisdiction:** Ireland  
**Version:** `{{template.version}}`  
**Generated on:** `{{meta.generated_at}}`  
**Generated by:** `{{meta.generated_by}}`

The template uses placeholders that the generator fills from employer, employee, role, and policy data. Conditional clauses are shown/hidden based on generator toggles (e.g. `contract_type`, `hours_mode`, `work_location_mode`).

### 2.1 Document structure (clause summary)

| Clause | Topic | Key placeholders / toggles |
|--------|--------|----------------------------|
| Parties | Employer & Employee | `employer.legal_name`, `employer.registered_address`, `employee.full_name`, `employee.address`, `contract.issue_date` |
| 1 | Commencement | `employment.start_date` |
| 2 | Job title & duties | `role.title`, `role.reports_to_name`, `role.reports_to_title`, `role.summary_duties` |
| 3 | Place of work | `work.location_primary`, `work.location_range`; toggle `work_location_mode` = single \| multiple \| variable |
| 4 | Contract type & duration | `employment.contract_type`; 4A Permanent, 4B Fixed-term; toggle + fixed_term fields |
| 5 | Probation | `probation.length`, `probation.notice`, `probation.extension_max`; fields: enabled, length, notice, extension_allowed |
| 6 | Hours & rosters | `working.hours_per_week`, `working.days_pattern`, `working.roster_notice`; 6A fixed / 6B variable; toggle `hours_mode` |
| 6B | Variable hours | `working.expected_hours_range`, `working.reference_days_hours`, `working.shift_notice_min`, `working.cancellation_notice` |
| 7 | Rest breaks | `working.break_policy` |
| 8 | Remuneration | `pay.type`, `pay.amount`, `pay.frequency`, `pay.method`, `pay.basic`, optional commission/bonus/allowances, `pay.deductions_clause` |
| 9 | Overtime | `pay.overtime_policy`, `pay.overtime_rate` |
| 10 | Sunday work | `working.sunday_work_required`, `pay.sunday_premium` |
| 11 | Annual leave & public holidays | `leave.annual_leave`, `leave.request_process` |
| 12 | Sick leave | `sick.notify_person`, `sick.notify_time`, `sick.cert_requirements`, `sick.company_scheme_terms`; toggle company scheme |
| 13 | Pension | `pension.summary`, scheme name/employer contrib, or `pension.prsa_clause` |
| 14 | Training | `training.policy` |
| 15–16 | Disciplinary & grievance | `policies.disciplinary_doc_name`, `policies.grievance_doc_name` |
| 17–18 | Confidentiality & data protection | `policies.privacy_notice_name` |
| 19 | Company property | `property.list`, `property.deductions_authorisation` |
| 20 | Secondary employment | `secondary_employment.objective_grounds` |
| 21 | Health and safety | `policies.safety_statement_location` |
| 22 | Termination & notice | `termination.employee_notice`, `termination.employer_notice`, `termination.pilon_gardenleave` |
| 23 | Lay-off / short-time | Toggle `layoff_shorttime_enabled` |
| 24–25 | Entire agreement; governing law | Ireland |
| Signatures | Employer & employee | `signature.*`, `employee.full_name` |

### 2.2 Generator toggles (summary)

- **work_location_mode:** `single` \| `multiple` \| `variable`
- **contract_type:** `permanent` \| `fixed_term` \| `part_time` \| `casual`
- **Fixed-term:** `end_date` OR `end_event`, `early_termination_allowed`
- **probation:** `enabled`, `length`, `notice`, `extension_allowed`
- **hours_mode:** `fixed` \| `variable` (variable requires expected range, reference days/hours, shift/cancellation notice)
- **sick.company_scheme_enabled**
- **layoff_shorttime_enabled**

---

## 3. Generator Mapping (Data Object for UI)

The UI builds a data object that the generator uses to fill the template and show/hide clauses.

### 3.1 Required (always)

- **employer:** `legal_name`, `registered_address`
- **employee:** `full_name`, `address`
- **employment:** `start_date`, `contract_type`
- **role:** `title`, `reports_to_name`, `reports_to_title`, `summary_duties`
- **work:** location mode + location details
- **working:** `hours_mode` + hours/roster/notice details
- **pay:** `type`, `amount`, `frequency`, `method`; overtime/Sunday settings
- **leave:** `annual_leave`, `request_process`
- **termination:** `employee_notice`, `employer_notice` approach
- **Policy doc references:** disciplinary, grievance, privacy, safety statement

### 3.2 Conditional blocks

- **fixed_term:** `end_date` OR `end_event`, `early_termination_allowed`
- **probation:** `enabled`, `length`, `notice`, `extension_allowed`
- **variable hours:** expected range, reference days/hours, shift notice, cancellation notice
- **company sick pay:** scheme terms
- **pension:** scheme vs PRSA facilitation
- **lay-off/short-time:** enabled
- **commission/bonus/allowances:** terms

(Optional next step: turn the template into a “clause library” where each clause is keyed by tags like `contract_type=fixed_term`, `hours_mode=variable`, so the generator simply selects clauses from dropdown answers.)

---

## 4. Contract Generator System Design (How the Program Works)

The Contract section is where the **employer (admin)** creates and manages **template contracts**, assigns them to **roles**, and then **assigns contracts to staff**. **Staff** receive their contract (e.g. generated PDF or link), sign it, and **upload the signed version** for compliance.

### 4.1 Roles and actions

| Actor | Actions |
|-------|--------|
| **Admin (employer)** | Create and edit contract templates (e.g. IE_CONTRACT_V1); set generator toggles and default values; assign templates to job roles; assign a contract (template + filled data) to a staff member; view signed contracts. |
| **Staff** | View their assigned contract; download/print; sign; upload signed copy (PDF/image); see status (pending signature / signed). |

### 4.2 Main concepts

1. **Contract template**  
   - Reusable blueprint (e.g. Irish employment contract) with placeholders and conditional clauses.  
   - Stored with template ID, jurisdiction, version.  
   - Admin creates/edits templates in the Contract Generator (e.g. “Contract Generator” → create/edit template).

2. **Template ↔ roles**  
   - Admin links templates to **job roles** (e.g. “Sales Assistant”, “Manager”).  
   - So when assigning a contract to a staff member, the system can suggest or default the template by the staff member’s role.

3. **Assigned contract (instance)**  
   - For a given staff member: chosen template + filled data (employer, employee, role, work, pay, leave, etc.).  
   - Generates a document (e.g. PDF) for the employee to sign.  
   - Status: e.g. “Issued”, “Pending signature”, “Signed”, “Signed copy uploaded”.

4. **Signed contract upload**  
   - Staff uploads the signed contract (PDF/image) into the system.  
   - Stored against that contract instance and linked to the employee for compliance and audit.

### 4.3 End-to-end flow

1. **Admin:** Create or select a contract template (e.g. Irish employment contract); configure toggles and defaults.  
2. **Admin:** Associate the template with one or more job roles.  
3. **Admin:** For a staff member, “Assign contract”: pick template (or use role default), fill generator fields (or pull from employee/role/company data), generate and issue.  
4. **Staff:** Receives contract (email/link or in-app); downloads/prints; signs.  
5. **Staff:** Uploads signed version in the app (Compliance / Contract / “My contracts” or similar).  
6. **Admin:** Can see which staff have signed and uploaded; compliance view shows contract status and signed copy.

### 4.4 UI structure (current and intended)

- **Contract hub** (`/compliance/contract`): Entry point – Contract Generator, Employee Handbook, and **Contract rules** (Irish law summary + link to this README).  
- **Contract Generator** (`/compliance/contract/generator`): Create/edit templates; assign templates to roles; assign contract to staff; list issued contracts.  
- **Contract rules** (`/compliance/contract/rules`): Short summary of Irish contract law and link to full documentation (this README).  
- **Staff-facing:** “My contracts” (or under My Compliance): list of assigned contracts; upload signed copy; view status.

### 4.5 Data (conceptual)

- **contract_templates:** id, tenant_id, name, template_id (e.g. IE_CONTRACT_V1), **jurisdiction** (e.g. IE), version, body or clause_set (see clause library in §5.9), generator_schema (toggles and required fields). Once a contract is issued from a template version, that version is frozen (§5.3).  
- **contract_templates_roles:** template_id, job_role_id (which roles use which template).  
- **contract_assignments:** id, tenant_id, staff_id, template_id, **template_version** (frozen at issue), status (see §5.11: issued \| viewed \| signed \| uploaded \| admin_verified), generated_at, issued_at, **generation_input_json** (immutable, §5.10), **rendered_output** (e.g. PDF reference; immutable), signed_upload_file_id (nullable). **Audit:** created_by, issued_by, admin_verified_by; timestamps for created, issued, viewed, signed, uploaded, admin_verified (§5.16).  
- **Signed file:** Stored in existing file/storage; referenced by `contract_assignments.signed_upload_file_id`.  
- **Company defaults:** separate table or tenant settings for probation, sick pay, notice, Sunday premium, breaks, pension (§5.7).

This README should be kept in sync with the Irish Employment Contract Law Report PDF and the generator template so that the implemented Contract Generator and rules UI stay aligned with Irish law and the intended product behaviour.

---

## 5. Generator & Compliance Requirements (Spec)

The following requirements apply to the Contract Generator implementation: clause tagging, statutory override, version locking, handbook separation, UI behaviour, defaults, preview, clause library, data immutability, status model, jurisdiction, safeguards, binding clarity, audit trail, and future-law readiness.

### 5.1 Clause tagging

- **Tag each clause** as one of:
  - **legal_required** – required by law (Day 5 / 1‑month terms or equivalent).
  - **best_practice** – recommended but not legally mandatory.
  - **company_policy** – company-specific (e.g. discretionary benefits, internal rules).
- **Removal rules:**
  - **legal_required:** Prevent removal; these clauses cannot be removed from a template or from an issued contract.
  - **best_practice:** Warn when the user removes or disables the clause, but allow removal.
  - **company_policy:** Allow removal without blocking (optional).
- Clause metadata (e.g. in the clause library) must store this tag per clause.

### 5.2 Non-removable statutory override clause

- **Insert a clause** stating that statutory rights prevail over contract terms (e.g. “Nothing in this contract reduces or removes any statutory entitlement. Where legislation provides a greater benefit, the statutory provision applies.”).
- **Lock this clause:** It cannot be edited or removed. It is always included and rendered with fixed wording.
- Treat it as a special system clause (e.g. tag `statutory_override`, non-editable, non-removable).

### 5.3 Strict template version locking

- **Freeze** template text, schema, and clause set once a contract is **issued** (i.e. once an instance is generated and sent/assigned to an employee).
- **No edits** to the issued contract’s template version or generation data after issue.
- **Legal or wording changes:** Require a **new template version** (e.g. IE_CONTRACT_V2). Existing issued contracts remain tied to the old version; new assignments can use the new version.
- Version history should be retained so that issued contracts can always be reproduced from their frozen template version.

### 5.4 Separate contract content from handbook content

- **Contracts** must **reference** procedures (e.g. disciplinary, grievance, sick reporting) by document name or handbook section, not embed full step-by-step text by default.
- **Operational detail** (full procedures, examples, forms) lives in the **Employee Handbook**.
- Contract clauses should use references such as “as set out in [Disciplinary Procedure]” or “in accordance with the Employee Handbook”. Ensure the generator and clause library support “reference only” wording rather than inlining handbook content.

### 5.5 Generator-level warnings (UI only)

- **Display contextual warnings** in the generator UI when relevant (e.g. “Unfair dismissal rights may apply after 12 months’ service”; “Repeated fixed-term renewals without objective justification may convert to an open-ended contract”).
- **Do not include** these warning texts in the contract document itself; they are for admin awareness only.
- Warnings should be triggered by generator inputs (e.g. contract_type = fixed_term, employment start date, renewal count).

### 5.6 Progressive disclosure in the generator UI

- **Show advanced sections only when triggered** by earlier selections, e.g.:
  - **Sunday work** section only if Sunday working is required.
  - **Variable hours** section (reference days/hours, shift notice, cancellation) only when hours are unpredictable/variable.
  - **Fixed-term** fields (end date, end event, early termination) only when contract type is fixed-term.
- Reduces clutter and guides the user through only relevant fields.

### 5.7 Company-level defaults

- **Store company-level defaults** for: probation (length, notice, extension), sick pay (company scheme yes/no, terms), notice (employee/employer), Sunday premium, breaks policy, pension (scheme vs PRSA).
- **Per-contract override:** Allow overriding defaults when generating a specific contract.
- **Warning when overriding:** If the user changes a value away from the company default, show a brief warning (e.g. “This differs from company default”) so overrides are deliberate.

### 5.8 Enhanced contract preview

- **Visually distinguish** in the preview:
  - **Mandatory legal clauses** (e.g. badge or label “Legal requirement”).
  - **Optional / best-practice / company-policy clauses** (e.g. “Best practice” or “Company policy”).
- **Indicate clauses sourced from handbook references** (e.g. “Ref: Employee Handbook – Disciplinary Procedure”) so the reader knows where to find full detail.
- Preview is read-only for issued contracts; no editing of rendered content.

### 5.9 Clause library architecture

- **Break the template** into **discrete, versioned, tagged clauses** (not one monolithic blob).
- Each clause has: unique id, version, tag (legal_required / best_practice / company_policy), jurisdiction, optional condition keys (e.g. contract_type, hours_mode).
- **Select clauses dynamically** based on generator inputs (e.g. when hours_mode = variable, include variable-hours clause set).
- Templates then become a “recipe” of clause IDs + ordering; the generator assembles the document from the clause library. Enables reuse and consistent updates (e.g. update one clause version across templates).

### 5.10 Immutable generation data

- **Persist** for each issued contract:
  - **Rendered output** (e.g. PDF or final HTML) – immutable.
  - **Exact JSON** (or equivalent) used to generate that contract – immutable.
- **Prevent edits** to issued contract data; no changing employee name, pay, dates, or clause set after issue. Corrections require voiding/cancelling and re-issuing (new instance) if appropriate.

### 5.11 Refined contract status model

- **Separate states** for each contract instance (e.g. assignment):
  - **issued** – contract generated and sent/assigned to the employee.
  - **viewed** – employee (or system) has recorded that the contract was viewed.
  - **signed** – employee has indicated signed (e.g. e-sign or attestation).
  - **uploaded** – signed copy (PDF/image) has been uploaded.
  - **admin_verified** – admin has confirmed the signed copy is acceptable (e.g. after checking signature/date).
- Use these for reporting and compliance (e.g. “Pending upload”, “Pending admin verification”).

### 5.12 Jurisdiction as a first-class field

- **All templates, clauses, and rules** are explicitly **scoped to a jurisdiction** (e.g. IE for Ireland).
- **Schema and UI** must treat jurisdiction as a required, first-class field (e.g. template.jurisdiction, clause.jurisdiction).
- **Prepare for future jurisdictions** without refactor: avoid hardcoding “Ireland” in logic; use jurisdiction codes (e.g. IE, UK) and jurisdiction-specific rule sets (e.g. which clauses are legal_required for IE).

### 5.13 Lay-off / short-time clause safeguard

- **If the lay-off/short-time clause is enabled:** Require **explicit admin acknowledgment** of implications (e.g. checkbox “I understand the legal implications of lay-off/short-time in Ireland”) before the clause is included.
- **If not enabled:** **Hide the clause entirely** from the template and generated document; do not show an empty or “not applicable” lay-off section.
- Reduces risk of including a significant clause without deliberate consent.

### 5.14 Explicit reference-hours requirement for variable work

- When **hours are unpredictable / variable** (e.g. hours_mode = variable or casual with variable scheduling):
  - **Reference days and hours** (the days and time band during which work may be assigned) are **mandatory**.
  - **Cancellation notice** (minimum notice if a shift is cancelled) is **mandatory**.
- Generator UI must require these fields (and validate) when the variable-hours path is selected; do not allow issuing without them. Aligns with Irish law (Employment (Miscellaneous Provisions) Act 2018, etc.).

### 5.15 Contract vs policy binding

- **Add a clause** (or clarify in existing “entire agreement” or “policies” clause) that states:
  - Which referenced documents are **contractual** (form part of the contract) and which are **guidance only** (can be updated by the employer with notice, not contractually binding in the same way).
- E.g. “The Employee Handbook and [listed] policies are provided for guidance and may be updated. The following documents form part of this contract: [list].” Reduces ambiguity about what can be changed without contract variation.

### 5.16 Audit trail enhancement

- **Record** for each contract instance (and optionally for template edits):
  - **Who** created, edited (if pre-issue), issued, and verified the contract.
  - **Timestamp** for each action (created_at, issued_at, viewed_at, signed_at, uploaded_at, admin_verified_at).
- Store actor (user id or role) and action type so that compliance and disputes can be audited.

### 5.17 Future-law-change readiness

- **Internal flagging:** Add a way to flag **templates or clauses** that are **affected by statutory changes** (e.g. sick pay day increases, minimum wage, new leave types).
- Purpose: when law changes, admins can quickly identify which templates/clauses need a new version or review. Does not change the contract text by itself; it is an operational/versioning aid.
- Optional: link to a “law change” or “review due” date so that templates can be reviewed when legislation changes.

---

## 6. Standard Irish Template Set & SME/Retail Flow

This section defines a small set of standard Irish contract templates that cover the most common SME/retail scenarios. Goals: **legal minimum clauses always present**, **admin answers only a small number of questions**, and **compliant contract generation without requiring legal knowledge**.

### 6.1 Standard template set (minimal but complete)

**Five base templates** cover ~95% of SME/retail hires:

| Template | Description |
|----------|-------------|
| **IE Permanent Full-Time (Fixed Hours)** | Open-ended, full-time, fixed weekly hours and pattern. |
| **IE Permanent Part-Time (Fixed Hours)** | Open-ended, part-time, fixed weekly hours and pattern. |
| **IE Fixed-Term Full-Time (Fixed Hours)** | Fixed end date or event, full-time, fixed hours. |
| **IE Fixed-Term Part-Time (Fixed Hours)** | Fixed end date or event, part-time, fixed hours. |
| **IE Variable Hours / Casual (Unpredictable Schedule)** | Variable/unpredictable hours; reference days/hours and cancellation notice required. |

**Optional add-ons (later):**

- **IE Manager Template** – enhanced confidentiality, possible restrictive covenants, PILON/garden leave defaults.
- **IE Student/Minor Template** – only if the system will support under-18 employment rules.

### 6.2 Template composition model (how templates cover all bases)

Each standard template is composed from:

- **Core mandatory legal clauses** (non-removable).
- **Default company policy clauses** (editable within limits).
- **Scenario clauses** (toggle-driven, e.g. fixed-term, variable hours).
- **Optional add-on packs** (role-based, e.g. manager, cash handling).

Templates are **pre-selected bundles of clause packs**, not one-off documents.

#### 6.2.1 Clause packs

Maintain clause packs as separate logical groups. Templates select which packs are included.

| Pack key | Purpose |
|----------|---------|
| **core_required_ie** | Always included; Day 5 + 1‑month legal minimums; statutory override. |
| **contract_type_permanent** | Permanent (open-ended) wording. |
| **contract_type_fixed_term** | Fixed-term wording (end date/event, early termination). |
| **hours_fixed** | Fixed hours and roster notice. |
| **hours_variable_unpredictable** | Variable hours; reference days/hours; shift and cancellation notice. |
| **pay_hourly** / **pay_salary** | Pay type–specific wording. |
| **sunday_work_yes** / **sunday_work_no** | Sunday work and premium, or no Sunday work. |
| **probation_yes** / **probation_no** | Probation clause or none. |
| **pension_scheme** / **prsa_facilitation** | Pension wording. |
| **sick_statutory_only** / **sick_company_scheme** | Sick leave wording. |
| **termination_statutory_only** / **termination_enhanced** | Notice and PILON/garden leave. |
| **layoff_shorttime_yes** / **layoff_shorttime_no** | Lay-off/short-time clause or omit. |
| **handbook_reference_pack** | References to disciplinary, grievance, privacy, safety (no embedded procedure text). |

Templates = pre-selected bundles of these packs; generator fills variables and applies company defaults.

### 6.3 How admins use standard templates (mechanism)

#### Step 1: System ships with standard templates (locked defaults)

- Templates are **available out of the box** for IE jurisdiction.
- **Legal-required packs** are locked (no removal, no edit of legal wording).
- Admin can only:
  - Edit **employer/employee variables** (name, address, etc.).
  - Edit **company policy values** (probation length within limits, sick scheme terms, notice enhancements, etc.).
  - Toggle **optional add-on packs** (where legally allowed).

#### Step 2: Company setup (one-time defaults)

Admin completes a **company contract setup wizard** once. Stored as company-level defaults:

- Legal name + address.
- Default probation (length + notice).
- Default break policy.
- Default Sunday premium method.
- Default sick policy (statutory only vs company scheme).
- Pension status (scheme vs PRSA).
- Default notice approach (statutory only vs enhanced).
- Handbook document references (disciplinary, grievance, privacy notice, safety statement).

These defaults **populate every new contract**; admin only overrides when needed for a specific assignment.

#### Step 3: Role mapping

Admin **links templates to roles** so each role has a default (recommended) template, e.g.:

- Sales Assistant → **IE Permanent Part-Time (Fixed Hours)** (default).
- Supervisor → **IE Permanent Full-Time (Fixed Hours)**.
- Seasonal Staff → **IE Fixed-Term Part-Time (Fixed Hours)**.
- Cover Staff → **IE Variable Hours / Casual**.

This becomes the **recommended template** when assigning a contract to an employee in that role.

#### Step 4: Contract assignment

When assigning a contract to an employee:

1. System **preselects the role’s default template** (if role is known).
2. **Pulls company defaults** (probation, sick, pension, notice, handbook refs, etc.).
3. **Pulls employee data** (name, address, start date, role).
4. **Prompts only for missing fields** required by that template (e.g. fixed-term end date, variable-hours reference days/hours and cancellation notice).
5. Validates; then **generates** the contract.

Result: minimal questions, no legal knowledge required, compliant output.

### 6.4 Template editing rules (so you don’t break compliance)

#### 6.4.1 Always locked

- All clauses tagged **legal_required**.
- **Statutory override** clause.
- Required **Day 5** and **1‑month** information fields (presence and structure; values come from admin/employee data).

#### 6.4.2 Editable (safe)

- **Policy references** (handbook names/links).
- **Company policy amounts/values** (within schema limits).
- **Optional packs** ON/OFF where the law allows (e.g. lay-off, company sick pay, enhanced notice).

#### 6.4.3 Must be versioned

Any change that **affects meaning** triggers a **new template version**:

- Clause wording changes.
- Schema changes (new required fields).
- Toggle default changes that alter employee rights.

**Issued contracts remain tied to the old version forever**; no in-place edits to issued contract data.

### 6.5 How the system ensures “covers all bases”

#### 6.5.1 Coverage by contract type × hours mode

The five standard templates deliberately cover:

- **Permanent** vs **fixed-term**.
- **Full-time** vs **part-time**.
- **Fixed hours** vs **variable/unpredictable** hours.

Anything outside these axes is handled by **optional add-on packs**.

#### 6.5.2 Add-on packs (optional)

Add-on packs are **role-based** and **toggle-driven**; they cannot override statutory rights.

| Pack | Typical use |
|------|-------------|
| **manager_pack** | Stronger confidentiality, IP, garden leave + PILON defaults. |
| **cash_handling_pack** | Till shortage policy reference + investigation wording. |
| **vehicle_driver_pack** | Licence requirements, safe driving policy references. |
| **remote_work_pack** | Remote/flexible arrangements wording. |

### 6.6 Generator behaviour with standard templates

#### 6.6.1 Template selection logic

- If **role has a default template** → preselect that template.
- Else → show **recommended templates** based on inputs, e.g.:
  - Fixed-term selected → show fixed-term options.
  - Variable hours selected → show variable-hours template.
  - Part-time selected → show part-time options.

#### 6.6.2 Validation

Before generation:

- **Validate required fields** for the chosen template (e.g. fixed-term end date, variable-hours reference days/hours and cancellation notice).
- **Validate compliance rules** (legal-required packs present, statutory override present).
- **Block generation** if critical compliance is missing.
- **Warn** if best-practice elements are missing (e.g. probation notice, handbook refs).

### 6.7 Data model requirements (minimal)

- **contract_templates** – template_id, jurisdiction, version, packs_enabled (list of pack keys), schema (required/optional fields and toggles), body or clause refs (if not fully pack-driven).
- **contract_packs** – pack_key, clause_keys[] (ordered list of clause identifiers in that pack).
- **contract_clauses** – clause_key, text (or template with placeholders), tags (legal_required / best_practice / company_policy), jurisdiction, version.
- **company_contract_defaults** – tenant_id, defaults_json (probation, sick, pension, notice, handbook refs, etc.).
- **role_contract_defaults** – role_id, template_id (default template for that role).
- **contract_assignments** – employee_id, template_id, template_version (frozen), filled_data_json (immutable), output_files (rendered PDF etc.), status (issued, viewed, signed, uploaded, admin_verified).

See also §4.5 and §5.10–5.11 for immutable generation data, status model, and audit fields.

### 6.8 Operating principle

Standard templates should:

- **Require the fewest admin decisions possible** (company defaults + role default template + employee data + only missing fields).
- **Block non-compliant generation** (legal-required packs and fields enforced).
- **Remain readable and consistent** across the business (same clause library, same packs).
- **Evolve via versioning** – never via in-place edits on issued contracts.
