# Weekly Planner System - Build Specification

**This spec is the single source of truth for the weekly planner/scheduler interface.**

---

## Key V1 Decisions

- **Tenant setting controls staff accept/decline ability** (default OFF): Staff are view-only by default. If tenant enables `staff_can_accept_decline_shifts`, staff can accept/decline their own published shifts only.
- **Published shifts are editable** (audit logged): Admin/Manager can edit draft and published shifts. Confirmed shifts are editable but always audit logged. All changes after shift start/end are mandatory audit logged.
- **Tenant timezone is authoritative** (IANA timezone): Scheduler operates in tenant timezone, not user device timezone. All shifts stored as TIMESTAMPTZ (UTC canonical).
- **Overnight shifts supported**: Shifts can span multiple days. Grid renders cross-day shifts with continuation indicators.
- **V1 "real-time" = optimistic UI + refetch** (upgrade path enabled): Optimistic updates + refetch after each mutation. V2 will use realtime subscriptions powered by audit log events.

---

## 1. Overview

The Weekly Planner is an interactive scheduling interface that allows managers and admins to create, view, edit, and manage staff shifts for a given week. The interface leverages modern React features including drag-and-drop, right-click context menus, keyboard shortcuts, and real-time updates to provide a premium scheduling experience.

### Key Features

- **Interactive Week View**: Visual calendar grid showing 7 days with hourly time slots
- **Drag and Drop**: Move shifts between staff members, days, and time slots
- **Right-Click Context Menus**: Quick actions (edit, delete, duplicate, copy)
- **Multi-Select**: Select and bulk edit multiple shifts
- **Conflict Detection**: Visual warnings for scheduling conflicts (overlapping shifts, availability violations, working rule violations)
- **Real-Time Updates**: Optimistic UI updates with server sync
- **Staff Filtering**: Filter by location, department, or individual staff members
- **Bulk Operations**: Copy shifts across days, duplicate weeks, bulk publish
- **Keyboard Navigation**: Full keyboard support for power users
- **Mobile Responsive**: Touch-friendly interface for mobile devices

---

## 2. Scope and Non-Scope

### V1 Scope (Included)

**Core Scheduling Interface**
- Week view (7-day calendar grid)
- Create, edit, delete shifts via drag-and-drop
- Right-click context menus for quick actions
- Visual shift blocks with staff name, time, location
- Color coding by location, department, or shift type
- Conflict detection and warnings
- Staff availability overlay
- Working rules validation

**Shift Management**
- Create shifts by dragging from staff list or clicking empty slots
- Edit shifts inline (time, staff, location, breaks)
- Delete shifts with confirmation
- Duplicate shifts within week or to other weeks
- Copy shifts to multiple days
- Bulk publish/unpublish shifts

**Filtering and Views**
- Filter by location
- Filter by department
- Filter by individual staff member
- Show/hide staff members
- Toggle availability overlay
- Toggle conflict warnings

**Validation and Rules**
- Check staff availability (from `availability` table)
- Validate working rules (min/max hours, consecutive days, rest periods)
- Prevent overlapping shifts for same staff
- Enforce location capacity (if configured)
- Validate shift times (start < end, reasonable duration)

**Permissions**
- Admin/Manager: Full CRUD on all shifts in tenant
- Staff: View-only by default. If tenant enables it, staff can accept/decline their own published shifts.
- Tenant isolation enforced via RLS

### V2+ Non-Scope (Explicitly Excluded)

**Advanced Features**
- Recurring shifts
- Shift swapping between staff
- Shift requests/approvals workflow
- Labor cost calculations
- Overtime warnings
- Skill-based scheduling
- Auto-scheduling/optimization
- Multi-week view
- Month view
- Print/export functionality
- Shift notes/comments
- Shift attachments
- Mobile app (web-only for V1)

**Integration Features**
- Calendar sync (Google Calendar, Outlook)
- SMS/Email notifications
- Payroll integration
- Time clock integration

---

## 3. Database Schema

### Existing Tables (No Changes Required)

**`shifts` Table** (Already exists)
- `id` (UUID, primary key)
- `tenant_id` (UUID, not null, references `tenants.id`)
- `location_id` (UUID, not null, references `locations.id`)
- `staff_id` (UUID, not null, references `staff.id`)
- `start_time` (TIMESTAMPTZ, not null)
- `end_time` (TIMESTAMPTZ, not null)
- `break_duration_minutes` (INTEGER, default 0)
- `status` (TEXT, default 'draft', check: 'draft', 'published', 'confirmed', 'cancelled')
- `notes` (TEXT, nullable)
- `created_by` (UUID, references `profiles.id`)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**`availability` Table** (Already exists)
- `id` (UUID, primary key)
- `tenant_id` (UUID, not null)
- `staff_id` (UUID, not null, references `staff.id`)
- `day_of_week` (INTEGER, 0-6, not null)
- `start_time` (TIME, not null)
- `end_time` (TIME, not null)
- `is_available` (BOOLEAN, default true)
- `valid_from` (DATE, nullable)
- `valid_until` (DATE, nullable)

**`staff` Table** (Already exists)
- Contains working rules: `min_hours_per_week`, `max_hours_per_week`, `max_hours_per_day`, `max_consecutive_days`, `min_rest_hours_between_shifts`
- Contains location: `location_id`
- Contains department: `department`

### New Tables (V1 - Optional Enhancements)

**`tenant_settings` Table** (V1 Required)

**Purpose:** Store tenant-level configuration settings for the scheduler.

**Columns:**
- `tenant_id` (UUID, primary key, references `tenants.id` ON DELETE CASCADE)
- `timezone` (TEXT, not null) - IANA timezone identifier (e.g., `Europe/Dublin`, `America/New_York`)
- `staff_can_accept_decline_shifts` (BOOLEAN, not null, default false)
- `created_at` (TIMESTAMPTZ, not null, default now())
- `updated_at` (TIMESTAMPTZ, not null, default now())

**Decisions:**
- One row per tenant (enforced by primary key on `tenant_id`)
- This is the V1 source of truth for tenant scheduler settings
- Settings UI may be built later, but schema must exist from V1
- Default timezone should be set during tenant creation (or migration for existing tenants)

**`shift_audit_log` Table** (V1 Required)
- `id` (UUID, primary key)
- `tenant_id` (UUID, not null, references `tenants.id`)
- `shift_id` (UUID, nullable, references `shifts.id` ON DELETE SET NULL)
- `action_type` (TEXT, not null, check: 'created', 'updated', 'deleted', 'published', 'unpublished', 'confirmed', 'cancelled', 'reassigned', 'time_changed', 'location_changed', 'break_changed', 'notes_changed')
- `is_post_start_edit` (BOOLEAN, not null, default false) - True if shift was already started/ended in tenant timezone when edit occurred
- `before_snapshot` (JSONB, nullable)
- `after_snapshot` (JSONB, nullable)
- `message` (TEXT, not null) - Human-readable audit message
- `changed_by` (UUID, not null, references `profiles.id`)
- `changed_at` (TIMESTAMPTZ, not null, default now())

**Purpose:** Immutable audit trail of all shift changes (create/update/delete/status/location/staff/time changes), supports future notifications and shift detail history.

**Implementation Notes:**
- Audit log entries are written by API on every mutation endpoint (POST, PUT, DELETE)
- Messages must be human-readable (example: "Changed start time from 09:00 to 10:00")
- `before_snapshot` and `after_snapshot` contain full shift object state for comparison
- `shift_id` is nullable to support audit logging of deletions (preserve audit even if shift deleted)
- **Post-Start Edit Tagging**: If shift is already started/ended in tenant timezone when edit occurs, set `is_post_start_edit = true` so future notification rules can trigger differently

**`shift_conflicts` Table** (V1 - Optional, for audit trail)
- `id` (UUID, primary key)
- `tenant_id` (UUID, not null)
- `shift_id` (UUID, not null, references `shifts.id`)
- `conflict_type` (TEXT, check: 'overlap', 'availability', 'working_rule', 'capacity')
- `conflict_details` (JSONB, nullable)
- `detected_at` (TIMESTAMPTZ, default now())
- `resolved_at` (TIMESTAMPTZ, nullable)
- `resolved_by` (UUID, nullable, references `profiles.id`)

**Note**: Conflict detection can be done in real-time via API validation, so `shift_conflicts` table is optional for V1. It may be useful for audit trails and reporting in V2.

### Required Indexes (Already Exist)

- `idx_shifts_tenant_id` on `shifts(tenant_id)`
- `idx_shifts_location_id` on `shifts(location_id)`
- `idx_shifts_staff_id` on `shifts(staff_id)`
- `idx_shifts_start_time` on `shifts(start_time)`
- `idx_shifts_status` on `shifts(status)`
- `idx_availability_tenant_id` on `availability(tenant_id)`
- `idx_availability_staff_id` on `availability(staff_id)`

### Additional Indexes (May Need for Performance)

```sql
-- Composite index for week view queries (get all shifts for a week)
CREATE INDEX IF NOT EXISTS idx_shifts_tenant_week ON shifts(tenant_id, start_time) 
WHERE start_time >= CURRENT_DATE - INTERVAL '7 days';

-- Index for staff availability queries
CREATE INDEX IF NOT EXISTS idx_availability_staff_day ON availability(staff_id, day_of_week);
```

---

## 4. RLS Security and Tenant Isolation

### Tenant Isolation (Always Enforced)

**RLS Behavior:**
- All queries on `shifts` table must filter by `tenant_id` from tenant context
- Users can only see shifts where `tenant_id` matches their current tenant
- RLS policies automatically enforce tenant isolation at database level

**Implementation:**
- Use `getTenantContext()` in all API routes to get `tenantId`
- All database queries must include `.eq('tenant_id', tenantId)`
- RLS policies on `shifts` table enforce tenant isolation
- RLS policies on `availability` table enforce tenant isolation

### Existing RLS Policies (Already Implemented)

**Admin/Manager Permissions:**
- Admin: Full CRUD on shifts in their tenant
- Manager: Full CRUD on shifts in their tenant
- Policies use `user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')` or `'manager'`

**Staff Permissions:**
- Staff: Can only SELECT their own shifts (where `staff_id` matches their `user_id`)
- Staff: Cannot INSERT or DELETE shifts (regardless of tenant setting)
- Staff UPDATE permissions controlled by tenant setting (see "Tenant Setting: Staff Shift Response" below)
- Policies use `staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid())`

### Tenant Setting: Staff Shift Response

**Setting Name:** `staff_can_accept_decline_shifts` (boolean)

**Default:** `false` (staff view-only by default)

**Behavior:**
- **If `false`**: Staff can only view their own shifts (no status changes allowed)
- **If `true`**: Staff can update their own shifts only to accept/decline (status changes only)

**Status Transitions Allowed for Staff:**
- `published` → `confirmed` (accept shift)
- `published` → `cancelled` (decline shift)

**Decisions:**
- This setting is global per tenant in V1
- Per-shift override is not built in V1, but the infrastructure must allow adding a per-shift override later from the shift detail screen
- Staff cannot create/edit/delete shifts regardless of this setting
- Staff can only change status on their own published shifts when setting is enabled
- **RLS must enforce the setting too**: Staff UPDATE policy must only allow status changes when `staff_can_accept_decline_shifts = true` for that tenant (not API-only enforcement)

### API-Level Security

**Role Checks:**
- `GET /api/schedule/week`: Admin/Manager can view all shifts, Staff can view only their shifts
- `POST /api/schedule/shifts`: Admin/Manager only
- `PUT /api/schedule/shifts/[id]`: Admin/Manager can edit any shift, Staff can only update their own shifts if tenant setting enabled (status changes only: published → confirmed/cancelled)
- `DELETE /api/schedule/shifts/[id]`: Admin/Manager only
- `POST /api/schedule/shifts/bulk`: Admin/Manager only

**Tenant Validation:**
- All API endpoints must verify `tenant_id` matches user's current tenant context
- Return 404 Not Found if shift not found or in different tenant
- Return 403 Forbidden if user lacks required role

---

## 5. Business Rules and Validation

### Shift Creation Rules

**Required Fields:**
- `staff_id`: Must reference valid staff in same tenant
- `location_id`: Must reference valid location in same tenant
- `start_time`: Must be valid TIMESTAMPTZ
- `end_time`: Must be valid TIMESTAMPTZ, must be after `start_time`
- `tenant_id`: Automatically set from tenant context

**Time Validation:**
- `end_time` must be after `start_time`
- Shift duration must be reasonable (minimum 15 minutes)
- No hard maximum duration in V1, but UI warns if duration exceeds 16 hours (warning only, not a hard block)
- Shifts can span multiple days (overnight shifts supported)
- Week view can show any selected week (past or future)
- Shift creation is allowed in any week (past or future) for operational fixes

**Status Rules:**
- New shifts default to `status = 'draft'`
- `published` shifts are visible to staff
- `confirmed` shifts indicate staff confirmed attendance
- `cancelled` shifts are hidden but preserved for audit

### Edit Rules by Status

**Draft:**
- Admin/Manager: Full edit/delete allowed
- Staff: No access (view-only if visible)

**Published:**
- Admin/Manager: Full edit and delete allowed
- Staff: View-only by default, or accept/decline if tenant setting enabled

**Confirmed:**
- Admin/Manager: Edit allowed but always audit logged (no silent edits)
- Staff: View-only (no status changes after confirmation)
- **Status Reversal Rule**: Staff cannot change status after confirming/declining (no undo). Admin/Manager may change status from `confirmed`/`cancelled` back to `published`/`draft` only with audit log.

**Cancelled:**
- Admin/Manager: Can change status from `cancelled` → `published` (restore) with audit log
- Admin/Manager: Can edit other fields with audit log
- Staff: View-only
- **Visibility Rule**: Cancelled shifts are excluded from default week view results unless `includeCancelled=true` query param is set (admin/manager only)
- **UI Rule**: Cancelled shifts are hidden in the planner by default; they can only be edited via shift detail screen (V2) or when `includeCancelled=true` is enabled in admin/manager view

**Decisions:**
- Published shifts are editable by Admin/Manager (not locked)
- Confirmed shifts are editable by Admin/Manager but require mandatory audit logging
- Any change to a shift after it has started or ended must create an audit entry
- Audit entries are displayed later in Shift Detail screen (V2 UI), but logging must exist from V1

### Conflict Detection Rules

**Global Conflict Response Rule:**
- **Overlapping shifts**: Always return 409 Conflict (hard block, cannot save)
- **Availability violations and working rule violations**: Always return 200 OK with `conflicts[]` array in response (soft warnings, UI displays warnings)
- Availability and working rule violations never return 409 - they are warnings only

**1. Overlapping Shifts (Same Staff)**
- Staff cannot have two shifts that overlap in time
- Overlap = `start_time < other_shift.end_time AND end_time > other_shift.start_time`
- **Action**: Hard block - return 409 Conflict, cannot save (no override allowed in V1)

**2. Availability Violations**
- Check staff availability for the day of week and time range
- Convert shift times to tenant local timezone for availability comparisons
- Query `availability` table: `staff_id`, `day_of_week`, `start_time <= shift.start_time`, `end_time >= shift.end_time`, `is_available = true`
- Consider `valid_from` and `valid_until` dates
- **Action**: Soft warning - allow save but return conflicts in response so UI shows warnings (no hard block)

**3. Working Rules Violations**

**Min/Max Hours Per Week:**
- Calculate total hours for staff in the week (sum of all shifts)
- Check against `staff.min_hours_per_week` and `staff.max_hours_per_week`
- **Action**: Soft warning - allow save but return conflicts in response so UI shows warnings (no hard block)

**Max Hours Per Day:**
- Calculate total hours for staff on the specific day
- Check against `staff.max_hours_per_day`
- **Action**: Soft warning - allow save but return conflicts in response so UI shows warnings (no hard block)

**Max Consecutive Days:**
- Count consecutive days with shifts for staff
- Check against `staff.max_consecutive_days`
- **Action**: Soft warning - allow save but return conflicts in response so UI shows warnings (no hard block)

**Min Rest Hours Between Shifts:**
- Check time between end of previous shift and start of next shift
- Check against `staff.min_rest_hours_between_shifts`
- **Action**: Soft warning - allow save but return conflicts in response so UI shows warnings (no hard block)

**4. Location Capacity (V2 - Not in V1)**
- Check if location has capacity limit
- Count staff scheduled at location for the time slot
- **Action**: Show warning if at capacity

### Overnight Shift Rendering Rules

**Decision:** Shifts can span multiple days (overnight shifts supported).

**Rendering:**
- If a shift spans multiple days, the UI should render it as a single block anchored at start day with continuation indicators showing it extends to the next day
- Each day column shows the portion of the shift that falls within that day's time range
- Visual indicators (dashed border, arrow icon) show the shift continues to the next day

**Conflict Detection:**
- Conflict detection and hour calculations must use full timestamps (not day-only)
- Overlap detection checks the complete time range across all days
- Working rules calculations (consecutive days, rest periods) use full timestamp ranges

### Shift Status Workflow

**Draft → Published:**
- Admin/Manager can publish shifts to make them visible to staff
- Bulk publish action available
- Published shifts appear in staff's shift list

**Published → Confirmed:**
- If `staff_can_accept_decline_shifts = true`, staff can confirm their shift (changes status to 'confirmed')
- Confirmed shifts are editable by Admin/Manager but always audit logged

**Published → Cancelled:**
- If `staff_can_accept_decline_shifts = true`, staff can decline their shift (changes status to 'cancelled')
- Admin/Manager can also cancel any shift

**Any Status → Cancelled:**
- Admin/Manager can cancel shifts
- Cancelled shifts are hidden from planner but preserved in database
- Can be restored if needed

---

## 6. UI Structure and React Infrastructure

### Page Layout

**Route:** `/schedule/week`
**File:** `apps/web/app/(dashboard)/schedule/week/page.tsx`

**Header Section:**
- Week navigation (previous week, next week, today button)
- Current week display (e.g., "Dec 16 - Dec 22, 2024")
- Filter controls (location, department, staff)
- View options (show availability, show conflicts, color coding)
- Actions (create shift, bulk publish, duplicate week, export)

**Main Content:**
- Week grid (7 columns for days, rows for time slots or staff)
- Two view modes:
  - **Time-based view**: Days as columns, time slots as rows (hourly or 30-min intervals)
  - **Staff-based view**: Staff as rows, days as columns (alternative view)

### React Components Structure

```
WeekPlannerPage
├── WeekPlannerHeader
│   ├── WeekNavigation
│   ├── WeekDisplay
│   ├── FilterControls
│   └── ViewOptions
├── WeekPlannerGrid
│   ├── DayColumn (x7)
│   │   ├── DayHeader
│   │   ├── TimeSlot (x48 for 30-min intervals)
│   │   │   └── ShiftBlock (if shift exists)
│   │   │       ├── ShiftContent
│   │   │       └── ShiftActions (on hover/right-click)
│   └── StaffList (sidebar or first column)
└── ShiftModal (for create/edit)
    ├── StaffSelector
    ├── LocationSelector
    ├── DateTimePicker
    ├── BreakDurationInput
    └── NotesInput
```

### Drag and Drop Implementation

**Library:** `@dnd-kit/core` or `react-beautiful-dnd` (recommend `@dnd-kit` for better accessibility)

**Drag Sources:**
- Staff list items (drag to create new shift)
- Existing shift blocks (drag to move/resize)

**Drop Targets:**
- Time slots in day columns
- Other staff rows (to reassign shift)

**Drag Operations:**
1. **Create Shift**: Drag staff member to time slot → opens create modal with pre-filled staff and time
2. **Move Shift**: Drag shift block to new time slot → updates `start_time` and `end_time`
3. **Resize Shift**: Drag shift block edge → updates `end_time` (duration change)
4. **Reassign Shift**: Drag shift block to different staff row → updates `staff_id`

**Validation During Drag:**
- Show drop preview with conflict warnings
- Highlight valid drop zones (green) and invalid zones (red)
- Prevent drop if conflict detected (unless override confirmed)

### Right-Click Context Menus

**Library:** Custom implementation or `react-contextmenu` or `@radix-ui/react-context-menu`

**Context Menu Actions:**
- **Edit Shift**: Open edit modal
- **Delete Shift**: Show confirmation, then delete
- **Duplicate Shift**: Create copy with same details (different time/day)
- **Copy to...**: Copy shift to other days (multi-select)
- **Publish/Unpublish**: Change status
- **View Details**: Show full shift information
- **Cancel Shift**: Mark as cancelled

**Implementation:**
- Right-click on shift block opens context menu
- Menu positioned at cursor location
- Click outside closes menu
- Keyboard accessible (Shift+F10 or context menu key)

### Keyboard Navigation

**Shortcuts:**
- `Arrow Keys`: Navigate between shifts
- `Enter`: Edit selected shift
- `Delete`: Delete selected shift
- `Escape`: Close modals/menus
- `Ctrl/Cmd + C`: Copy selected shift
- `Ctrl/Cmd + V`: Paste shift
- `Ctrl/Cmd + D`: Duplicate shift
- `Ctrl/Cmd + A`: Select all shifts in view
- `Ctrl/Cmd + Z`: Undo (if undo/redo implemented)
- `Ctrl/Cmd + Y`: Redo
- `Tab`: Navigate between controls
- `Space`: Toggle selection

**Focus Management:**
- Shiftable focus between shift blocks
- Visual focus indicator
- Keyboard-only navigation support

### Multi-Select

**Selection Modes:**
- **Click**: Select single shift
- **Ctrl/Cmd + Click**: Toggle shift selection
- **Shift + Click**: Select range of shifts
- **Click + Drag**: Select multiple shifts (box selection)

**Bulk Actions:**
- Delete selected shifts
- Publish/unpublish selected shifts
- Copy selected shifts to other days
- Change location for selected shifts
- Change break duration for selected shifts

**Visual Feedback:**
- Selected shifts highlighted with border/background
- Selection count displayed in header
- Bulk action buttons appear when selection active

### Time & Timezone Rules (V1 Required)

**Tenant Timezone is Authoritative:**
- Scheduler operates in tenant timezone, not user device timezone
- Each tenant must have a configured IANA timezone (e.g., `Europe/Dublin`, `America/New_York`)
- Tenant timezone is stored in `tenant_settings` table (see Database Schema section)
- This must be selectable by admin in Settings

**Storage:**
- Shift timestamps are stored as TIMESTAMPTZ (UTC canonical)
- All database queries use UTC timestamps

**Display:**
- UI always converts to tenant timezone for display and interactions
- All time inputs and displays show times in tenant local timezone

**Week Boundaries:**
- `weekStart` query param is interpreted as Monday 00:00:00 in tenant timezone
- Week range is `[weekStartLocal, weekStartLocal + 7 days)` then converted to UTC for querying
- Week boundaries respect DST transitions in tenant timezone

**Availability Comparisons:**
- Availability is stored as TIME ranges (time-of-day only)
- Shift times must be converted into tenant local time-of-day for availability checks
- Availability checks compare local time-of-day, not UTC timestamps

**Decisions:**
- Tenant timezone setting location: Stored in `tenant_settings` table (see Database Schema section)
- Week start calculation always uses tenant timezone (Monday 00:00:00 local time)
- All API endpoints that accept time parameters must interpret them in tenant timezone context

### Real-Time Updates

**V1 Real-Time Strategy:**
- **Optimistic UI + refetch**: Update UI immediately on drag/drop, then sync with server
- **Refetch after mutation**: After each mutation endpoint completes, refetch affected data
- **Show loading state**: Display "syncing" state during server sync
- **Revert on error**: Revert optimistic update on error with error message
- **Optional polling**: Lightweight polling can exist, but not required for V1

**V2 Upgrade Path:**
- Realtime subscriptions and notifications will be powered by audit log events (`shift_audit_log`) and/or DB realtime channels
- Notification system is out of scope for V1 UI, but audit log is required now to support it

**Error Handling:**
- Display error toast on failure
- Revert optimistic update
- Allow retry

**Server Sync:**
- Debounce rapid changes (e.g., resize drag)
- Batch multiple updates when possible
- Show sync status indicator

### Responsive Design

**Desktop (>1024px):**
- Full week grid view
- Sidebar for staff list
- All features available

**Tablet (768px - 1024px):**
- Condensed week view
- Collapsible sidebar
- Touch-friendly drag targets

**Mobile (<768px):**
- Single day view (swipe between days)
- Vertical staff list
- Touch-optimized drag and drop
- Simplified controls

---

## 7. API Endpoints

### GET /api/schedule/week

**Purpose:** Fetch all shifts for a given week

**Query Parameters:**
- `weekStart` (required): ISO date string in format `YYYY-MM-DD` only (Monday of the week, no time component). If time is included, return 400 Bad Request.
- `locationId` (optional): Filter by location UUID
- `staffId` (optional): Filter by staff UUID (for staff role, auto-applied)
- `status` (optional): Filter by status (`draft`, `published`, `confirmed`, `cancelled`)
- `includeCancelled` (optional): Boolean, if `true` includes cancelled shifts (admin/manager only, default: `false`)

**Timezone Handling:**
- `weekStart` is interpreted as Monday 00:00:00 in tenant timezone
- Week range is `[weekStartLocal, weekStartLocal + 7 days)` then converted to UTC for database querying (exclusive end boundary: next Monday 00:00 local)
- `weekEnd` in response is inclusive date label (Sunday) in tenant timezone, while internal querying uses exclusive end boundary (next Monday 00:00 local)
- Response times are in UTC (client converts to tenant timezone for display)

**Response:**
```json
{
  "shifts": [
    {
      "id": "uuid",
      "staff_id": "uuid",
      "location_id": "uuid",
      "start_time": "2024-12-16T09:00:00Z",
      "end_time": "2024-12-16T17:00:00Z",
      "break_duration_minutes": 30,
      "status": "published",
      "notes": "Optional notes",
      "staff": {
        "id": "uuid",
        "first_name": "John",
        "last_name": "Doe",
        "preferred_name": "Johnny",
        "department": "Sales"
      },
      "location": {
        "id": "uuid",
        "name": "Main Office"
      }
    }
  ],
  "weekStart": "2024-12-16",
  "weekEnd": "2024-12-22",
  "note": "weekEnd is inclusive Sunday label in tenant timezone; internal query uses exclusive next-Monday boundary",
  "conflicts": [
    {
      "shift_id": "uuid",
      "type": "overlap",
      "message": "Overlaps with another shift"
    }
  ]
}
```

**Permissions:**
- Admin/Manager: All shifts in tenant for the week
- Staff: Only their own shifts

### POST /api/schedule/shifts

**Purpose:** Create a new shift

**Request Body:**
```json
{
  "staff_id": "uuid",
  "location_id": "uuid",
  "start_time": "2024-12-16T09:00:00Z",
  "end_time": "2024-12-16T17:00:00Z",
  "break_duration_minutes": 30,
  "notes": "Optional notes",
  "status": "draft"
}
```

**Response:** Same as shift object in GET response

**Validation:**
- Check all business rules (time, conflicts, availability, working rules)
- Return 400 Bad Request with validation errors if invalid
- Return 409 Conflict only if overlapping shifts detected (hard block, cannot save)
- Availability and working rule violations always return 200 OK with `conflicts[]` array in response (soft warnings, UI displays warnings)

**Permissions:**
- Admin/Manager only

### PUT /api/schedule/shifts/[id]

**Purpose:** Update an existing shift

**Request Body:** Same as POST, all fields optional

**Response:** Updated shift object

**Validation:**
- Check business rules
- All updates create audit log entries
- Changes to shifts after start/end time require mandatory audit logging (set `is_post_start_edit = true`)
- Return 400 Bad Request on validation failure
- Return 409 Conflict only if overlapping shifts detected (hard block, cannot save)
- Availability and working rule violations always return 200 OK with `conflicts[]` array in response (soft warnings, UI displays warnings)

**Permissions:**
- Admin/Manager: Can update any shift (draft, published, confirmed)
- Staff: Can only update their own shifts if `staff_can_accept_decline_shifts = true` (limited to status changes: `published` → `confirmed` or `published` → `cancelled`)

### DELETE /api/schedule/shifts/[id]

**Purpose:** Delete a shift

**Response:** `{ "success": true }`

**Permissions:**
- Admin/Manager only

### POST /api/schedule/shifts/bulk

**Purpose:** Bulk operations (create, update, delete multiple shifts)

**Request Body:**
```json
{
  "operation": "create" | "update" | "delete" | "publish" | "unpublish",
  "shifts": [
    { "id": "uuid", ... } // for update/delete
    { "staff_id": "uuid", ... } // for create
  ]
}
```

**Response:**
```json
{
  "success": true,
  "created": 5,
  "updated": 3,
  "deleted": 2,
  "errors": []
}
```

**Permissions:**
- Admin/Manager only

### GET /api/schedule/availability

**Purpose:** Get staff availability for a week (for overlay display)

**Query Parameters:**
- `weekStart` (required): ISO date string in format `YYYY-MM-DD` only (interpreted in tenant timezone)
- `staffId` (optional): Filter by staff UUID

**Timezone Handling:**
- Availability comparisons use tenant local time-of-day
- Shift times are converted to tenant timezone before comparing with availability TIME ranges

**Response:**
```json
{
  "availability": [
    {
      "staff_id": "uuid",
      "day_of_week": 1,
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "is_available": true
    }
  ]
}
```

**Permissions:**
- Admin/Manager: All staff in tenant
- Staff: Only their own availability

### GET /api/schedule/conflicts

**Purpose:** Get conflict analysis for a week

**Query Parameters:**
- `weekStart` (required): ISO date string in format `YYYY-MM-DD` only (interpreted in tenant timezone)

**Response:**
```json
{
  "conflicts": [
    {
      "shift_id": "uuid",
      "type": "overlap" | "availability" | "working_rule",
      "severity": "warning" | "error",
      "message": "Human-readable message",
      "details": {}
    }
  ]
}
```

**Permissions:**
- Admin/Manager only

---

## 8. Build Order

**CRITICAL: Do not start UI until API endpoints are done and tested.**

### Step 1: Review Existing Infrastructure
1. Review existing `shifts` table structure
2. Review existing RLS policies for shifts
3. Review existing API patterns in `/api/staff` routes
4. Review existing UI patterns in staff detail pages
5. Document existing React component patterns

### Step 2: Database Enhancements
1. Create `tenant_settings` table (V1 required)
2. Create `shift_audit_log` table (V1 required)
3. Add composite indexes for week view queries (if performance needed)
4. Create `shift_conflicts` table (optional, for audit trail)
5. Update RLS policies to enforce `staff_can_accept_decline_shifts` setting
6. Test queries for week view performance with timezone conversions
7. Document all schema changes

### Step 3: Implement API Endpoints
1. Create `GET /api/schedule/week` endpoint (with timezone handling)
2. Create `POST /api/schedule/shifts` endpoint (with audit logging)
3. Create `PUT /api/schedule/shifts/[id]` endpoint (with audit logging and tenant setting check)
4. Create `DELETE /api/schedule/shifts/[id]` endpoint (with audit logging)
5. Create `POST /api/schedule/shifts/bulk` endpoint (with audit logging)
6. Create `GET /api/schedule/availability` endpoint (with timezone conversion)
7. Create `GET /api/schedule/conflicts` endpoint (with timezone-aware conflict detection)
8. Implement all validation rules
9. Implement conflict detection logic (including overnight shift handling)
10. Implement audit log creation for all mutations
11. Implement tenant timezone retrieval and conversion utilities
12. Implement tenant setting check for staff permissions
13. Test all endpoints with various roles
14. Test error cases (403, 404, 409, 500)
15. Test timezone edge cases (DST transitions, week boundaries)

### Step 4: Implement Core UI Components
1. Create `WeekPlannerPage` component
2. Create `WeekPlannerHeader` component (navigation, filters)
3. Create `WeekPlannerGrid` component (main grid)
4. Create `DayColumn` component
5. Create `ShiftBlock` component
6. Create `ShiftModal` component (create/edit)
7. Add basic styling and layout

### Step 5: Implement Drag and Drop
1. Install and configure drag-and-drop library (`@dnd-kit`)
2. Implement drag from staff list
3. Implement drag to move shifts
4. Implement drag to resize shifts
5. Implement drag to reassign shifts
6. Add drop validation and visual feedback
7. Add conflict warnings during drag

### Step 6: Implement Right-Click Context Menus
1. Create `ContextMenu` component
2. Add right-click handlers to shift blocks
3. Implement context menu actions (edit, delete, duplicate, etc.)
4. Add keyboard accessibility (Shift+F10)

### Step 7: Implement Advanced Features
1. Add multi-select functionality
2. Add keyboard navigation
3. Add bulk operations UI
4. Add filter controls
5. Add availability overlay
6. Add conflict warnings display
7. Add real-time updates with optimistic UI

### Step 8: Responsive Design
1. Implement mobile view (single day, swipe)
2. Implement tablet view (condensed grid)
3. Test touch interactions
4. Optimize for small screens

### Step 9: QA and Testing
1. Test all drag-and-drop scenarios
2. Test all context menu actions
3. Test keyboard navigation
4. Test conflict detection
5. Test validation rules
6. Test permissions (admin, manager, staff)
7. Test tenant isolation
8. Test responsive design
9. Test error handling
10. Test performance with large datasets

---

## 9. Naming and Convention Rules

**Component Naming:**
- Use PascalCase: `WeekPlannerPage`, `ShiftBlock`, `DayColumn`
- Prefix with feature: `Schedule*` for schedule-related components

**File Naming:**
- Follow Next.js App Router conventions
- Components in `components/` directory
- Page in `app/(dashboard)/schedule/week/page.tsx`

**API Route Naming:**
- Follow existing pattern: `/api/schedule/*`
- Use RESTful conventions: `/api/schedule/shifts`, `/api/schedule/shifts/[id]`

**Variable Naming:**
- Use camelCase for variables: `weekStart`, `selectedShifts`
- Use descriptive names: `shiftBlockRef`, `dragStartTime`

**Type Naming:**
- Use PascalCase with descriptive names: `Shift`, `WeekPlannerProps`, `ConflictType`

---

## 10. Definition of Done

**API Complete:**
- All endpoints implemented and tested
- All validation rules enforced
- All conflict detection working (including overnight shifts)
- All error cases handled
- All permissions enforced (including tenant setting for staff)
- Tenant isolation verified
- Audit logging implemented for all mutations
- Timezone handling verified (DST, week boundaries)

**UI Complete:**
- All components implemented
- Drag and drop working smoothly (including overnight shift handling)
- Right-click context menus functional
- Keyboard navigation working
- Multi-select working
- Filters working
- Responsive design implemented
- Loading/error states handled
- Optimistic UI updates working (with refetch after mutation)
- Overnight shift rendering with continuation indicators
- Timezone-aware time display throughout

**Testing Complete:**
- All acceptance tests pass
- Tenant isolation verified
- Role-based permissions verified (including tenant setting for staff)
- Conflict detection verified (including overnight shifts)
- Validation rules verified
- UI interactions tested
- Performance tested with large datasets
- Mobile responsiveness tested
- Timezone edge cases tested (DST transitions, week boundaries)
- Audit logging verified for all mutations
- Overnight shift rendering and calculations verified

**Documentation Complete:**
- API endpoints documented
- Component props documented
- Usage examples provided
- Known limitations documented

---

**End of Specification**

