# Payroll Feature: Pay Runs

## Problem

Right now payroll is a one-shot CSV export. There's no concept of a **pay run** — a reviewable, editable, approvable record that captures a snapshot of what staff are owed for a pay period. Admins export a CSV, but there's no audit trail of *what was paid*, no way to adjust line items, no approval workflow, and no history of past runs.

## What Already Exists

| Exists | Status |
|--------|--------|
| `staff_hourly_rates` table with effective dates | Done |
| `timesheets` table with approval workflow | Done |
| Pay period config (weekly/fortnightly/semi-monthly/monthly) | Done |
| CSV export of approved timesheets x rates | Done |
| Overtime fields on staff (`overtime_enabled`, `overtime_multiplier`, etc.) | Schema only, not used in calculations |
| Currency system (USD/EUR/GBP) | Done |
| Audit log triggers on staff, shifts, timesheets | Done |
| `/payroll/runs` page | Empty state placeholder |
| `lib/staff-rates/utils.ts` batch rate lookup | Done |
| `lib/pay-period/utils.ts` period calculations | Done |

## Data Model

### New Tables

#### `pay_runs`

The header record for each payroll cycle.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `tenant_id` | UUID FK → tenants | NOT NULL |
| `pay_period_start` | DATE | Inclusive start |
| `pay_period_end` | DATE | Inclusive end |
| `status` | TEXT | `draft` → `reviewing` → `approved` → `finalised` |
| `name` | TEXT | Auto-generated, e.g. "Week 6 — 3 Feb to 9 Feb 2026" |
| `notes` | TEXT | Admin notes |
| `total_hours` | DECIMAL(10,2) | Denormalised sum |
| `total_gross_pay` | DECIMAL(12,2) | Denormalised sum |
| `staff_count` | INTEGER | Number of line items |
| `created_by` | UUID FK → profiles | Who created it |
| `approved_by` | UUID FK → profiles | Who approved it |
| `approved_at` | TIMESTAMPTZ | |
| `finalised_by` | UUID FK → profiles | Who finalised it |
| `finalised_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |

- **CHECK:** `status IN ('draft', 'reviewing', 'approved', 'finalised')`
- **UNIQUE:** `(tenant_id, pay_period_start, pay_period_end)` — prevents duplicate runs for same period.

#### `pay_run_lines`

One row per staff member per pay run. This is the snapshot.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `pay_run_id` | UUID FK → pay_runs | ON DELETE CASCADE |
| `tenant_id` | UUID FK → tenants | NOT NULL (for RLS) |
| `staff_id` | UUID FK → staff | |
| `employee_number` | TEXT | Snapshot from staff record at generation time |
| `staff_name` | TEXT | Snapshot: "first_name last_name" |
| `regular_hours` | DECIMAL(10,2) | Hours at base rate |
| `overtime_hours` | DECIMAL(10,2) | Hours exceeding contracted weekly hours |
| `total_hours` | DECIMAL(10,2) | regular + overtime |
| `hourly_rate` | DECIMAL(10,2) | Rate used (snapshotted) |
| `overtime_rate` | DECIMAL(10,2) | Calculated OT rate (snapshotted) |
| `regular_pay` | DECIMAL(12,2) | regular_hours x hourly_rate |
| `overtime_pay` | DECIMAL(12,2) | overtime_hours x overtime_rate |
| `adjustments` | DECIMAL(12,2) | DEFAULT 0 — manual +/- |
| `adjustment_reason` | TEXT | Required when adjustments != 0 |
| `gross_pay` | DECIMAL(12,2) | regular_pay + overtime_pay + adjustments |
| `status` | TEXT | `included` or `excluded` |
| `timesheet_ids` | UUID[] | Array of timesheet IDs that fed this line |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Why snapshot staff name/rate?** When you look at a finalised pay run from 6 months ago, you need to see the rate and name that applied *then*, not the current values.

#### `pay_run_changes`

Explicit change log for every edit to a pay run or its lines. Separate from `audit_logs` because this is user-facing (shown in the UI), not just a backend trail.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `pay_run_id` | UUID FK → pay_runs | ON DELETE CASCADE |
| `tenant_id` | UUID FK → tenants | |
| `pay_run_line_id` | UUID FK → pay_run_lines | NULL for run-level changes |
| `field_changed` | TEXT | e.g. `adjustments`, `status`, `overtime_hours` |
| `old_value` | TEXT | String representation |
| `new_value` | TEXT | String representation |
| `reason` | TEXT | Required for line edits on approved/finalised runs |
| `changed_by` | UUID FK → profiles | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

This gives you a reviewable, per-field audit trail visible directly in the pay run UI — e.g. "Sarah changed John's adjustment from £0 to £50 on Feb 8 — reason: missed 2h shift on Monday".

### RLS

Same pattern as existing tables:

- All three tables have `tenant_id NOT NULL`
- SELECT/INSERT/UPDATE/DELETE gated on `user_has_membership(auth.uid(), tenant_id)`
- Role checks: Admin/Superadmin for write operations, Manager for read-only

## Status Lifecycle

```
  ┌────────┐     ┌───────────┐     ┌──────────┐     ┌───────────┐
  │ draft  │────▶│ reviewing │────▶│ approved │────▶│ finalised │
  └────────┘     └───────────┘     └──────────┘     └───────────┘
       │              │                  │
       ▼              ▼                  │
   [deletable]   [editable]        [locked, export only]
```

| Status | Who can transition | What's allowed |
|--------|-------------------|----------------|
| **draft** | Creator (admin) | Full edits, add/remove lines, delete entire run |
| **reviewing** | Admin | Edit lines (adjustments, exclude/include staff), all edits logged to `pay_run_changes` |
| **approved** | Admin (different from creator, if >1 admin) | Edits still possible but require a `reason` on every change. Logged. |
| **finalised** | Admin | Locked. No edits. Can only export CSV/view. This is the permanent record. |

Backwards transitions: `reviewing` → `draft` (reopen), `approved` → `reviewing` (unapprove). Finalised is permanent.

## API Routes

All under `/api/payroll/`:

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/payroll/runs` | List pay runs (paginated, filterable by status) |
| `POST` | `/api/payroll/runs` | Create + generate a new pay run |
| `GET` | `/api/payroll/runs/[id]` | Get pay run with all lines |
| `PATCH` | `/api/payroll/runs/[id]` | Update run status or notes |
| `DELETE` | `/api/payroll/runs/[id]` | Delete draft run only |
| `PATCH` | `/api/payroll/runs/[id]/lines/[lineId]` | Edit a line (adjustments, exclude, override hours) |
| `GET` | `/api/payroll/runs/[id]/changes` | Get change log for a run |
| `POST` | `/api/payroll/runs/[id]/export` | Generate CSV for a run |
| `POST` | `/api/payroll/runs/preview` | Preview what a run would contain (dry run, no save) |

### `POST /api/payroll/runs` — Generate Pay Run

**Request:**

```json
{
  "pay_period_start": "2026-02-02",
  "pay_period_end": "2026-02-08"
}
```

**Server-side generation logic:**

1. Validate period doesn't overlap an existing non-draft run (409 Conflict)
2. Fetch all approved timesheets in the date range for this tenant
3. Group timesheets by `staff_id`
4. For each staff member:
   - Batch-fetch applicable `hourly_rate` via `getRatesForStaffBatch()`
   - Sum `total_hours` from all their approved timesheets
   - Calculate overtime if `staff.overtime_enabled`:
     - `regular_hours = min(total_hours, contracted_weekly_hours)`
     - `overtime_hours = max(0, total_hours - contracted_weekly_hours)`
     - `overtime_rate` = base rate × `overtime_multiplier` (or base rate + `overtime_flat_extra`)
   - Snapshot `employee_number`, name, rate into `pay_run_lines`
5. Calculate run totals and save `pay_runs` header
6. Log creation to `audit_logs`
7. Return the created run with all lines

### `PATCH /api/payroll/runs/[id]/lines/[lineId]` — Edit a Line

**Request:**

```json
{
  "adjustments": 50.00,
  "adjustment_reason": "Missed 2h shift on Monday — manual correction",
  "status": "included"
}
```

**Server-side:**

1. Check run status allows edits (not `finalised`)
2. If run is `approved`, require `reason` field
3. Write change to `pay_run_changes` with old/new values
4. Update the line
5. Recalculate `gross_pay = regular_pay + overtime_pay + adjustments`
6. Recalculate run totals (`total_hours`, `total_gross_pay`, `staff_count`)

## UI Design

### Page: `/payroll/runs` — Pay Runs List

**Layout:** PageHeader + filters + table

```
┌──────────────────────────────────────────────────────────┐
│  Pay Runs                                [+ Create Run]  │
│  Manage and process payroll for your team                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Total   │ │ Draft   │ │Reviewing│ │Finalised│       │
│  │   12    │ │    2    │ │    1    │ │    9    │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                          │
│  Filter: [All Statuses ▾]   [Search by period name...]  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Period          │ Staff │  Hours │    Gross │Status│  │
│  ├────────────────────────────────────────────────────┤  │
│  │ Week 6          │       │        │          │      │  │
│  │ 2–8 Feb 2026    │   14  │ 420.50 │ £5,246.25│●Draft│  │
│  ├────────────────────────────────────────────────────┤  │
│  │ Week 5          │       │        │          │      │  │
│  │ 26 Jan–1 Feb    │   14  │ 412.00 │ £5,150.00│●Final│  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│              ‹ Previous  1  2  3  Next ›                 │
└──────────────────────────────────────────────────────────┘
```

**Status badges:**

- Draft: `bg-gray-100 text-gray-800`
- Reviewing: `bg-yellow-100 text-yellow-800`
- Approved: `bg-blue-100 text-blue-800`
- Finalised: `bg-green-100 text-green-800`

**"Create Run" button** opens a modal to select pay period (auto-suggests next period based on `pay_period` settings and last run's end date).

### Page: `/payroll/runs/[id]` — Pay Run Detail

**Layout:** Breadcrumb + header + summary cards + line items table + change log

```
┌──────────────────────────────────────────────────────────┐
│  ← Pay Runs / Week 6 — 2 Feb to 8 Feb 2026              │
│                                                          │
│  Status: ● Draft     [Mark as Reviewing ▸]  [Delete]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Staff    │  │ Total Hrs│  │Gross Pay │               │
│  │   14     │  │  420.50  │  │ £5,246.25│               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                          │
│  Line Items                          [Export CSV]        │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Employee    │ Reg Hrs│ OT Hrs│ Rate  │ Adj  │Gross │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ #001 J.Smith│  37.50 │  2.50 │£12.00 │   —  │£510  │  │
│  │ #002 A.Jones│  32.00 │  0.00 │£11.50 │+£50  │£418  │  │
│  │ #003 M.Lee  │  40.00 │  5.00 │£14.00 │   —  │£665  │  │
│  │    ⤷ adj: "Missed Monday shift — manual add"       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ─── Change Log ──────────────────────────────────────── │
│  │ 8 Feb 14:23  Sarah K.  Changed A.Jones adjustment    │  │
│  │              from £0 to £50 — "Missed Monday shift"  │
│  │ 7 Feb 09:15  Sarah K.  Created pay run               │  │
│  └────────────────────────────────────────────────────── │
└──────────────────────────────────────────────────────────┘
```

**Clicking a line item** opens an inline edit row (not a modal — keeps context visible):

```
┌────────────────────────────────────────────────────────┐
│ #002 A.Jones                                           │
│ Regular: 32.00h  │ OT: 0.00h  │ Rate: £11.50         │
│                                                        │
│ Adjustment: [£ ___50.00___]                            │
│ Reason:     [Missed Monday shift — manual add_______]  │
│                                         [Cancel] [Save]│
│                                                        │
│ ☐ Exclude from this pay run                            │
└────────────────────────────────────────────────────────┘
```

### Create Pay Run Modal

```
┌──────────────────────────────────────────┐
│  Create Pay Run                     [✕]  │
├──────────────────────────────────────────┤
│                                          │
│  Pay Period                              │
│  ┌────────────────────────────────────┐  │
│  │ ● 2 Feb – 8 Feb 2026 (suggested)  │  │
│  │ ○ Custom date range                │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Custom range (if selected):             │
│  Start: [2026-02-02]  End: [2026-02-08] │
│                                          │
│  Preview:                                │
│  ┌────────────────────────────────────┐  │
│  │ 14 staff with approved timesheets  │  │
│  │ 420.50 total hours                 │  │
│  │ £5,246.25 estimated gross          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ⚠ 3 staff have unapproved timesheets   │
│    in this period (will be excluded)     │
│                                          │
│                    [Cancel] [Create Run]  │
└──────────────────────────────────────────┘
```

The preview calls `POST /api/payroll/runs/preview` to show what the run would contain *before* committing. The warning about unapproved timesheets is important — it surfaces issues without blocking creation.

### Sidebar Update

The existing sidebar already has the Payroll section with "Pay Runs" as a nav item. No change needed — just wire the page.

## Overtime Calculation Logic

Leverages the existing but unused fields on `staff`:

```typescript
function calculateOvertimeForLine(
  totalHours: number,
  staff: {
    contracted_weekly_hours: number | null
    overtime_enabled: boolean
    overtime_rule_type: 'multiplier' | 'flat_extra' | null
    overtime_multiplier: number | null
    overtime_flat_extra: number | null
  },
  baseRate: number
): { regularHours: number; overtimeHours: number; overtimeRate: number } {

  if (!staff.overtime_enabled || !staff.contracted_weekly_hours) {
    return { regularHours: totalHours, overtimeHours: 0, overtimeRate: 0 }
  }

  const regularHours = Math.min(totalHours, staff.contracted_weekly_hours)
  const overtimeHours = Math.max(0, totalHours - staff.contracted_weekly_hours)

  let overtimeRate = baseRate
  if (staff.overtime_rule_type === 'multiplier' && staff.overtime_multiplier) {
    overtimeRate = baseRate * staff.overtime_multiplier  // e.g. 12 * 1.5 = 18
  } else if (staff.overtime_rule_type === 'flat_extra' && staff.overtime_flat_extra) {
    overtimeRate = baseRate + staff.overtime_flat_extra  // e.g. 12 + 5 = 17
  }

  return { regularHours, overtimeHours, overtimeRate }
}
```

## File Structure

```
apps/web/
├── app/
│   ├── api/payroll/
│   │   └── runs/
│   │       ├── route.ts                    # GET list, POST create
│   │       ├── preview/route.ts            # POST preview
│   │       └── [id]/
│   │           ├── route.ts               # GET detail, PATCH status, DELETE
│   │           ├── export/route.ts         # POST CSV export
│   │           ├── changes/route.ts       # GET change log
│   │           └── lines/
│   │               └── [lineId]/route.ts  # PATCH edit line
│   └── (dashboard)/payroll/
│       └── runs/
│           ├── page.tsx                    # List page (replace empty state)
│           ├── [id]/page.tsx              # Detail page
│           └── components/
│               ├── PayRunTable.tsx        # List table with status badges
│               ├── PayRunDetail.tsx       # Detail view with line items
│               ├── PayRunLineEditor.tsx   # Inline line edit form
│               ├── PayRunChangeLog.tsx    # Change history timeline
│               ├── CreatePayRunModal.tsx  # Create modal with preview
│               └── PayRunStatusActions.tsx # Status transition buttons
├── lib/payroll/
│   ├── generate-pay-run.ts                # Core generation logic
│   ├── overtime.ts                       # Overtime calculation
│   └── types.ts                          # Shared types
└── supabase/migrations/
    └── YYYYMMDD_create_pay_runs.sql      # Tables + RLS + indexes
```

## Running the migration

- **Local:** `supabase start` then `supabase db reset` (applies all migrations including `supabase/migrations/20260209000000_create_pay_runs.sql`).
- **Remote:** `supabase login`, `supabase link --project-ref <ref>`, then `supabase db push`.
- **Dashboard:** SQL Editor → paste contents of `20260209000000_create_pay_runs.sql` → Run.

## Migration Highlights

```sql
-- Indexes for performance
CREATE INDEX idx_pay_runs_tenant_status ON pay_runs(tenant_id, status);
CREATE INDEX idx_pay_runs_period ON pay_runs(tenant_id, pay_period_start, pay_period_end);
CREATE INDEX idx_pay_run_lines_run ON pay_run_lines(pay_run_id);
CREATE INDEX idx_pay_run_lines_staff ON pay_run_lines(staff_id);
CREATE INDEX idx_pay_run_changes_run ON pay_run_changes(pay_run_id, created_at DESC);

-- Prevent overlapping non-draft runs (application-level check too)
-- Uniqueness constraint on (tenant_id, pay_period_start, pay_period_end)
-- handles exact duplicates; overlap check done in API

-- Trigger to recalculate run totals when lines change
CREATE FUNCTION recalculate_pay_run_totals() ...
CREATE TRIGGER trg_recalculate_totals
  AFTER INSERT OR UPDATE OR DELETE ON pay_run_lines
  FOR EACH ROW EXECUTE FUNCTION recalculate_pay_run_totals();
```

## Security

| Operation | Required Role | Additional Checks |
|-----------|---------------|--------------------|
| List/view pay runs | Admin, Manager | Manager = read-only |
| Create pay run | Admin | |
| Edit lines | Admin | Reason required if run is `approved` |
| Transition to reviewing | Admin (creator) | |
| Transition to approved | Admin | Ideally different admin from creator (soft rule, not enforced in v1) |
| Transition to finalised | Admin | Cannot undo |
| Delete run | Admin | Draft only |
| Export CSV | Admin | |
| View change log | Admin, Manager | |

## What This Doesn't Cover (Future)

- **Tax calculations** — this is gross pay only. Tax/NI/deductions are external (accountant/HMRC software)
- **Payslip generation** — PDF payslips per staff member
- **Direct bank payments** — integration with payment providers
- **Salary staff** — this design is hourly-first; salary support would add a `salary_amount` on the line
- **Multi-period overtime** — overtime calculated per-run (weekly), not across fortnightly/monthly boundaries
- **Approval delegation** — only admins can approve, no custom approval chains

---

## Key Architectural Decisions

1. **Snapshot everything** — rates, names, hours are frozen at generation time so historical runs stay accurate.
2. **Separate change log table** — `pay_run_changes` is user-facing and shown in the UI, distinct from the backend `audit_logs`.
3. **Preview before create** — the dry-run endpoint surfaces unapproved timesheets and totals before committing.
4. **Inline editing** — line items edit in-place rather than in modals, keeping the full run context visible.
5. **Finalised is permanent** — once locked, the record is the source of truth for "what was paid".
