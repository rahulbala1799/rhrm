# Weekly Scheduler UI Redesign - Staff-Row Layout

**Status:** Ship-Ready Specification  
**Date:** 2024  
**Goal:** Replace time-slot grid with modern staff-row scheduler that supports multiple shifts per staff per day without overlaps, with instant optimistic UI updates.

---

## 0. Ship-Ready Decisions (Lock These)

### D0.1 Staff List Source

**Staff rows come from `GET /api/staff?pageSize=1000` and must include `{id, preferred_name, first_name, last_name, department, location_id, location.name}`.**

- Staff ordering: **A–Z by preferred_name else first_name** (stable ordering)
- Filters (dept/location/staff search) affect which rows render
- Staff list is tenant-scoped (same source as existing staff management)
- **Note:** If `/api/staff` does not return `preferred_name` or `department`, the endpoint must be updated to include these fields, or a separate query must be used that includes them

**Staff identity + display name rules (edge-proof):**
- **Display name:** `preferred_name ?? first_name ?? last_name ?? "Unnamed"` (deterministic rendering)
- **Sorting key:** `preferred_name ?? first_name ?? last_name ?? ""` (case-insensitive comparison)

### D0.2 What weekStart Means in UI

**weekStart is always the Monday date label (YYYY-MM-DD) in tenant timezone, even across DST transitions.**

- UI navigation modifies weekStart by ±7 days (tenant timezone)
- **Week navigation math (DST-Safe):** Take tenant-local Monday 00:00, add/subtract 7 calendar days, format YYYY-MM-DD
- **Ban native Date parsing for scheduler math:** No `new Date("YYYY-MM-DD")` for bucketing, week math, or apply-time-to-date
- **Use one timezone library consistently:** Luxon OR date-fns-tz (not both)
- Week boundaries: Monday 00:00:00 to Sunday 23:59:59 (tenant local time)
- Display label: "Dec 16 - Dec 22, 2024" (inclusive Sunday)

### D0.3 How Shifts Are Bucketed into Days

**A shift belongs to the day of its start_time in tenant timezone.**

- Convert `start_time` (UTC) to tenant timezone
- Determine day of week (0-6, Mon-Sun)
- Bucket by `staff_id` + `day`
- **Overnight shifts:** Additionally produce a ghost continuation in the next day (only if end day differs from start day)

**Day index mapping (explicit):**
- `dayIndex: 0 = Monday, 1 = Tuesday, 2 = Wednesday, 3 = Thursday, 4 = Friday, 5 = Saturday, 6 = Sunday`
- This matches bucketing logic + UI columns (7 columns, Mon-Sun)

### D0.4 Cancelled Shifts Behavior

**Default: cancelled are hidden.**

- Cancelled shifts excluded from default week view
- **If `includeCancelled=true` (admin/manager only):** show cancelled shifts, but:
  - **No drag** - cancelled shifts are not draggable
  - **No inline edits** - cannot edit from grid
  - **Only actions allowed in grid:**
    - **Restore is included in V1 grid context menu for cancelled shifts (admin/manager only)** - restore = status → `published`, uses `PUT /api/schedule/shifts/[id]` with status change, audit logged
    - "View Details" - opens shift detail modal (read-only)

**Cancelled toggle permissions:**
- **If user role is not admin/manager, the toggle is hidden (not just disabled)**
- **If staff somehow hits `includeCancelled=true` via URL, backend still enforces** (returns 403 or filters out cancelled shifts)

**Week endpoint expectation for cancelled:**
- **If `includeCancelled=false`, backend must not return cancelled shifts at all (not "returns but UI hides")**
- This avoids conflicts mapping weirdness + wasted payload
- Backend filters cancelled shifts before returning response

### D0.5 No Time Axis

**No hour grid, no time labels in grid.**

- Time is rendered in ShiftBlock content only
- No time column, no hourly rows, no time-based positioning
- Grid is purely staff rows × day columns

### D0.6 Optimistic UX Standard

**Never show blocking loading overlays/spinners after actions.**

- Use a subtle global sync indicator + toasts for errors/warnings
- Hard-block overlap (409) always reverts optimistic state
- All mutations follow optimistic pattern: immediate UI update → background API → refetch

---

## Executive Summary

This document describes the redesign of the Weekly Planner UI from a **time-slot grid** (time on left, shifts positioned by time) to a **staff-row scheduler** (staff as rows, days as columns). The new design:

- Removes the time axis from the grid
- Displays shifts stacked vertically within each staff/day cell
- Supports multiple shifts per staff per day without visual overlap
- Implements optimistic UI updates for instant feel (no blocking loading states)
- Maintains all existing backend contracts and business rules

---

## 1. UI Layout Requirements

### Current Layout (Time-Slot Grid)
```
┌─────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│  Time   │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │ Sun  │
├─────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  06:00  │      │      │      │      │      │      │      │
│  06:30  │      │      │      │      │      │      │      │
│  07:00  │      │      │      │      │      │      │      │
│  ...    │      │      │      │      │      │      │      │
│  23:00  │      │      │      │      │      │      │      │
└─────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

### New Layout (Staff-Row Scheduler)
```
┌──────────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│   Staff      │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │ Sun  │
├──────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ John Doe     │ ┌──┐ │      │ ┌──┐ │      │ ┌──┐ │      │      │
│ Sales        │ │09│ │      │ │09│ │      │ │09│ │      │      │
│              │ │- │ │      │ │- │ │      │ │- │ │      │      │
│              │ │17│ │      │ │17│ │      │ │17│ │      │      │
│              │ └──┘ │      │ └──┘ │      │ └──┘ │      │      │
├──────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ Jane Smith   │ ┌──┐ │ ┌──┐ │      │ ┌──┐ │      │      │      │
│ Kitchen      │ │08│ │ │14│ │      │ │08│ │      │      │      │
│              │ │- │ │ │- │ │      │ │- │ │      │      │      │
│              │ │12│ │ │22│ │      │ │12│ │      │      │      │
│              │ └──┘ │ └──┘ │      │ └──┘ │      │      │      │
│              │      │      │      │ ┌──┐ │      │      │      │
│              │      │      │      │ │18│ │      │      │      │
│              │      │      │      │ │- │ │      │      │      │
│              │      │      │      │ │22│ │      │      │      │
│              │      │      │      │ └──┘ │      │      │      │
└──────────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

### Key Differences

| Aspect | Old (Time-Slot) | New (Staff-Row) |
|--------|----------------|-----------------|
| **Left Column** | Time slots (06:00-23:00) | Staff list (name, dept, location) |
| **Grid Structure** | Time rows × Day columns | Staff rows × Day columns |
| **Shift Positioning** | Absolute positioned by time | Stacked vertically in cell |
| **Multiple Shifts** | Overlap (problematic) | Stack vertically (no overlap) |
| **Time Display** | Implicit from position | Explicit in ShiftBlock content |
| **Scroll Direction** | Vertical (time) | Both (staff + days) |

---

## 1.1 Grid Layout

**Sticky top header:** Days (Mon–Sun) with date label.

**Sticky left column:** Staff list (name + dept/location).

**The grid body scrolls both ways:**
- Horizontal for days (if needed)
- Vertical for staff

**Row height:** Consistent baseline (e.g., min height), but cells can scroll internally.

**⚠️ Scroll + Sticky Correctness (No Nested Scroll Hell):**
- **Single main scroll container:** One element controls both horizontal + vertical scrolling for the grid body (not nested scroll containers)
- **Sticky layers (locked z-index):**
  - Sticky left column (staff list): `z-index: 10`
  - Sticky top header (day headers): `z-index: 10`
  - ShiftBlocks: `z-index: 2`
  - Grid cells/background: `z-index: 1`
- **Cell internal scroll:** V1 allowed only for ShiftStack overflow (don't make every cell a scroll container by default)
- **Layering/overdraw prevention:** Ensure sticky headers do not overlap grid content incorrectly
- **Test with:** Large staff lists (100+ rows) and wide day columns to verify sticky behavior

### 1.2 Cell Behavior

Each cell (staff × day):

- **Is a drop zone** (accepts drag/drop)
- **Contains a ShiftStack:**
  - **Sorting:** Sort by tenant-local `start_time` ascending
  - **Stacking:** Stack vertically, never overlap visually
  - **Cancelled shifts:** Hidden by default. If shown (`includeCancelled=true`): no drag, no inline edit, only Restore + View Details
  - **Overflow:** If too many shifts: internal scroll (V1) - cell internal scroll allowed only for ShiftStack overflow (don't make every cell a scroll container by default)

### 1.3 ShiftBlock Content (Required)

**Time range:** `HH:mm–HH:mm` (tenant timezone)

**Location display:**
- **Source of truth:** `shifts[].location.name` from `GET /api/schedule/week`
- **V1 rule:** Display `location.name` as-is
- **If too long:** Truncate in UI only (ellipsis). No extra backend field (`short_name`) in V1
- **No extra fetches:** If location is `null`, show "Unknown location" (muted styling)

**Status pill** (`draft` / `published` / `confirmed` / `cancelled`)

**Conflict indicator icon (⚠️)** if warning exists (with accessible tooltip text via `title` or `aria-label`)

**Overnight indicator on primary block:** "→ next day"

**Ghost block:** "continues" (muted)

Example ShiftBlock:
```
┌─────────────────────┐
│ 09:00 - 17:00       │
│ Main Office         │
│ [Published] [⚠️]    │
└─────────────────────┘
```

---

## 3. Multiple Shifts Per Cell (No Overlap)

### 3.1 Vertical Stacking

If a staff member has multiple shifts on the same day:
- ShiftBlocks are **stacked vertically** inside that day cell
- **Never overlap** blocks
- Order: Sort by start time (earliest first)

### 3.2 Cell Height Management

**V1 Approach:**
- Each row has a **consistent minimum height** (e.g., 120px) for readability
- If shifts exceed visible space:
  - **Option A (Simple)**: Cell becomes scrollable (vertical scroll within cell)
  - **Option B (Enhanced)**: Show "+X more" expand button, expand on click

**Recommendation:** Start with Option A (scrollable cell) for V1, upgrade to Option B if needed.

### 3.3 Visual Consistency

- Avoid huge row expansion unless user explicitly expands
- Keep row heights consistent across staff for grid readability
- Use subtle borders/spacing between stacked ShiftBlocks

---

## 2. Timezone + Week Boundaries

### 4.1 Tenant Timezone Authority

**Tenant timezone (IANA string)** is authoritative for:
- `weekStart` boundaries (Monday 00:00 local)
- Determining which day a shift belongs to
- Displaying times in ShiftBlock

**Tenant timezone source:**
- **Tenant timezone comes from `tenant.timezone` (IANA string) available in the app session/tenant context**
- **If missing, fallback is UTC (not browser timezone)**

**Storage:**
- Shift timestamps remain stored as **UTC TIMESTAMPTZ**
- All database queries use UTC

**Week endpoint query boundaries in UTC:**
- **Week view fetch uses tenant-local Monday 00:00 → Sunday 23:59:59 converted to UTC for the query window**
- **End boundary rule (exclusive):** Week query window is start inclusive, end exclusive: `>= weekStartUtc AND < weekEndExclusiveUtc`
- This ensures the backend and UI agree on which shifts belong to the week
- Example: If tenant is `America/New_York` and week is Dec 16-22:
  - Monday 00:00 EST = `2024-12-16T05:00:00Z` (UTC)
  - Next Monday 00:00 EST = `2024-12-23T05:00:00Z` (UTC) (exclusive end)
  - Query window: `start_time >= 2024-12-16T05:00:00Z AND start_time < 2024-12-23T05:00:00Z` (exclusive end)

### 4.2 Day Bucketing Logic

**Critical:** Grouping logic must convert times to tenant timezone before determining day buckets.

**⚠️ DST/TIMEZONE LANDMINE WARNING:**
- **Every "day bucket" calculation must use the tenant IANA timezone (not browser locale)**
- **Do NOT use `new Date()` with local parsing or browser timezone**
- **Use a timezone library (e.g., `date-fns-tz`, `luxon`) with the tenant IANA timezone string**
- If you use `new Date()` + local parsing, DST weeks will quietly break (shifts will appear on wrong days during DST transitions)

**Timezone library choice (locked):**
- **Pick one timezone library and use it consistently:** Either `Luxon` OR `date-fns-tz` (not both)
- **Ban native `Date` parsing for any scheduler math:** No `new Date("YYYY-MM-DD")` for bucketing, week math, or apply-time-to-date
- **Mixed approaches = DST bugs:** If you mix native Date with timezone libraries, DST transitions will cause incorrect calculations
- **Recommendation:** Use `date-fns-tz` for consistency with existing `date-fns` usage, or `Luxon` if you prefer a more comprehensive timezone API

**Algorithm:**
```typescript
function groupShiftsByStaffAndDay(shifts: Shift[], timezone: string) {
  // Convert each shift's start_time to tenant timezone
  // Determine which day (Mon-Sun) the shift belongs to
  // Group by staff_id + day
  // Return: Map<staffId, Map<dayIndex, Shift[]>>
}
```

**Example:**
- Shift: `2024-12-16T22:00:00Z` (UTC)
- Tenant timezone: `Europe/Dublin` (UTC+0 in winter)
- Local time: `2024-12-16T22:00:00` (Monday)
- Day bucket: Monday

If same shift in `America/New_York` (UTC-5):
- Local time: `2024-12-16T17:00:00` (Monday)
- Day bucket: Monday

**Edge Case:** If shift starts at `2024-12-16T23:00:00Z` in `Europe/Dublin`:
- Local time: `2024-12-16T23:00:00` (Monday)
- Day bucket: Monday

But if shift starts at `2024-12-17T00:00:00Z`:
- Local time: `2024-12-17T00:00:00` (Tuesday)
- Day bucket: Tuesday

---

## 3. Overnight Shift Rules (Ship-Ready)

### 3.1 Rendering Rules

**If shift crosses midnight in tenant timezone:**

**Render primary block in start day cell:**
- Shows full time range (e.g., `22:00–06:00`)
- Shows "→ next day"
- This is the primary interaction point (click, drag, edit)
- **Primary block is the only one that shows full details/actions** (status pill, conflict icons, all interactive elements)

**Render ghost block in next day cell:**
- Muted style (lighter background, dashed border, reduced opacity)
- Text: "continues"
- Click opens same shift (same shift ID)
- Dragging ghost behaves exactly like dragging primary
- **Ghost block is click/drag only and always visually secondary (muted, no status pill/buttons)**

**⚠️ GHOST BLOCKS LANDMINE WARNING (Hard Ban From State):**
- **Ghost blocks are render-only projections; they must never be treated as real shifts**
- **Ghost blocks must never appear in:**
  - React state (`shifts`, `optimisticShifts`, any derived arrays)
  - Drag/drop data structures
  - Mutation payloads
  - Conflict mapping
- **Ghost identity:** Ghost uses the same `shift_id` as the primary shift
- **Dragging a ghost:** Behaves exactly like dragging primary, and the mutation payload references the primary shift id only
- **Ghost blocks are computed on-the-fly during render based on the primary shift's `start_time` and `end_time`**
- **Only the primary shift exists in state/API; ghosts are visual projections only**

**Visual Example:**
```
Monday Cell:          Tuesday Cell:
┌─────────────┐       ┌─────────────┐
│ 22:00-06:00 │       │ ┌─────────┐ │
│ Main Office │       │ │continues│ │
│ [→ next day]│       │ │(ghost)  │ │
└─────────────┘       │ └─────────┘ │
                      └─────────────┘
```

### 3.2 Edge Cases

**If shift spans > 2 days (rare but possible):**
- Render primary on start day
- Render ghost on every following day until end day (still same shift id)

**If shift ends exactly at 00:00 local:**
- It is not considered overnight into next day (end boundary exclusive for continuation visuals)
- Only render primary block (no ghost)

---

## 4. Interaction Model

### 4.1 Click to Create

**Clicking empty cell opens Create Shift modal:**

**Pre-filled:**
- `staff_id` - From row
- Selected day - From column (interpreted in tenant timezone)

**Default start/end (locked):**
- **Rule B:** `09:00–17:00` (simple, consistent default)
- **Note:** Rule A (last-used times per user) is deferred to V2 for simplicity

**Date handling:**
- Create modal prefill uses the clicked day column interpreted in tenant timezone
- Start/end timestamps are built in tenant timezone then converted to UTC for POST
- The created shift date is that day in tenant timezone, not local device date

**No time axis means the modal is where time is chosen.**

### 4.1.1 Keyboard / Accessibility (Minimum V1)

**Minimum accessibility requirements:**

- **ShiftBlock is focusable and activatable:**
  - `<button>` preferred, otherwise `role="button"` + `tabIndex={0}`
  - `Enter`/`Space` triggers click
  - Visible focus ring

- **Conflict icon has accessible tooltip text:**
  - Use `title` or `aria-label` (not just icon)
  - Tooltip text must be descriptive

- **Context menu keyboard support:**
  - `Shift+F10` opens
  - Arrows navigate
  - `Enter` selects
  - `Esc` closes

- **Maintain focus across optimistic updates + refetch:**
  - No focus loss during state updates
  - Preserve focus state when refetching data
  - Focus visible on interactive elements

- **Drag & drop keyboard support (V2):**
  - V1: Drag & drop is mouse/touch only (acceptable for V1)
  - V2: Consider keyboard-based move operations (arrow keys + modifier)

### 4.2 Drag & Drop Rules (No Time Axis)

**Dragging a shift to:**

**Another staff same day:**
- Change `staff_id`
- Keep same local date + clock times

**Another day same staff:**
- Change date portion
- Keep clock times

**Another staff + another day:**
- Update both staff and date portion
- Keep clock times

**Important: "Keep clock times" means:**
1. Convert shift start/end to tenant local time
2. Apply same `HH:mm` onto the target date in tenant local
3. Convert back to UTC TIMESTAMPTZ for API

**Drag/drop target identity:**
- **Drop target payload always includes:** `{ target_staff_id, target_day_index (0-6), target_date_yyyy_mm_dd }` (date in tenant timezone)
- **Mutation payload is computed from that, not from DOM position**

**⚠️ DST/TIMEZONE LANDMINE WARNING:**
- **Every "apply HH:mm to target date" operation must use the tenant IANA timezone (not browser locale)**
- **Do NOT use `new Date()` with local parsing or browser timezone**
- **Use a timezone library with the tenant IANA timezone string**
- If you use browser locale for date/time operations, DST weeks will quietly break (times will shift incorrectly during DST transitions)

**"Apply HH:mm to target date" DST edge cases:**
- **If local time is invalid (spring forward gap):** Move forward to the next valid minute
- **If local time is ambiguous (fall back overlap):** Pick the earlier occurrence
- This single rule prevents random 1-hour shifts during DST transitions

**Overnight shift drag behavior:**
- When dragging an overnight shift to a new day/staff: **Preserve duration and clock times in tenant timezone**
- Example: If shift was `22:00–06:00` (8-hour duration), it stays `22:00–06:00` on the target day
- Ghost blocks regenerate automatically after save/refetch based on the new date and preserved clock times
- The shift remains overnight if the clock times cross midnight in tenant timezone on the target day

### 4.3 Drag Validation

**Overlap validation is enforced server-side (409 Conflict).**

- UI should not attempt to be "smart" with client-side overlap blocking beyond basic UX hints (e.g., visual feedback during drag)
- All overlap detection and blocking happens server-side via API validation
- On 409 response: Revert optimistic update + toast error
- This prevents duplicate logic and mismatch bugs between client and server

**Warnings:** Keep + mark warnings (availability/working rules are warnings, not hard blocks)

**Drag when filtered:**
- If source staff row disappears mid-drag due to filters/search changing: **Cancel drag** (simplest approach)
- Do not allow dropping into filtered-out staff rows (already specified)
- If target staff row disappears mid-drag: Cancel drag and revert to original position

---

## 5. Optimistic Update Requirements (No Jank)

### 5.1 Optimistic Mutation Pattern (Mandatory)

**For create/update/move/delete:**

1. **Apply optimistic state immediately** (UI looks done)
2. **Fire API request** (background)
3. **Show subtle "Syncing…" indicator** (non-blocking)
4. **On success:**
   - Refetch week data in background
   - Merge with minimal UI movement
5. **On error:**
   - Revert optimistic state
   - Show toast with human readable error

### 5.2 No Visible Loading States After Actions

**Do not show:**
- Cell spinners
- Full-page loading overlays
- Disabling the entire grid

**Only allowed "feedback":**
- Header syncing indicator
- Toast messages

### 5.3 Toast Standards (Examples)

**409 overlap:** "Shift not saved: overlaps another shift."

**403:** "Not allowed: you don't have permission."

**404:** "Shift not found (it may have been deleted)."

**500:** "Server error: try again."

### 5.4 Refetch Without Flicker

**Merge rule (mandatory):**
- During in-flight mutation for shift_id X, server refetch results must not overwrite optimistic state for X until mutation resolves; then reconcile
- Preserve scroll position
- Preserve selection state
- Avoid re-keying entire rows/cells on refetch

### 5.5 Optimistic Merge Keying (Create Operations)

**Temp ID strategy for creates:**
- **Temp id format:** `temp_<uuid>` (e.g., `temp_550e8400-e29b-41d4-a716-446655440000`)
- Store optimistic shift with temp-id in state
- After POST succeeds, receive real shift with server-assigned `id`
- **Reconciliation match keys:** `staff_id`, `location_id`, `start_time`, `end_time`
- **Timestamp tolerance:** Treat timestamps equal if within ±1 second (UTC)
- **Replacement rule:** Replace temp shift id with server shift id without re-keying the component (avoid flicker)
- **If reconciliation fails:** Remove temp shift and insert server shift (accept small flicker > duplicates)

### 5.6 Concurrency / Multi-User Edits (Deterministic UX)

**What happens if two managers move the same shift simultaneously:**
- One mutation wins (first to complete server-side)
- The other mutation receives 409 Conflict or refetch reveals mismatch
- **If refetch shows shift changed by someone else while mutation was in-flight:**
  - **If `shift_id` exists but differs in `staff_id`/`start_time`/`end_time`/`location_id`/`status`:** Revert optimistic + toast: "Shift was modified by another user. Please refresh."
  - **If `shift_id` no longer exists:** Remove it + toast: "Shift was deleted by another user."
- **Server remains authoritative:** Always trust server state over optimistic state after refetch
- **Expected behavior:** One wins, the other gets revert + toast on refetch mismatch

---

## 5. Conflict + Warning Display

### 5.1 Conflict Data Source

**Use conflicts returned from `GET /api/schedule/week` response only (no extra calls).**

The week endpoint already includes a `conflicts[]` array in its response. Do not call `/api/schedule/conflicts` separately.

### 5.2 Mapping Conflicts

**API warnings come as `conflicts[]` from week endpoint response.**

Map to ShiftBlocks by `shift_id`.

**Conflict mapping (what if conflicts include cancelled/hidden shifts):**
- **Only render warnings for shifts currently visible in the grid**
- **Ignore conflicts for filtered-out or cancelled-hidden shifts**
- Week endpoint conflicts may include shifts you're not rendering; filter them before mapping to ShiftBlocks

### 5.3 UI Behavior

**Overlap never shows as warning in UI because it never saves** (409 hard block).

**Availability / working rules:**
- Show ⚠️ on ShiftBlock
- Tooltip shows conflict message
- Optional: Badge count

---

## 6. Cancelled Shift Handling

**Default: cancelled are hidden.**

**If `includeCancelled=true` (admin/manager only):** show cancelled shifts, but:
- **No drag** - cancelled shifts are not draggable
- **No inline edits** - cannot edit from grid
- **Only actions allowed in grid:**
  - **Restore is included in V1 grid context menu for cancelled shifts (admin/manager only)** - restore = status → `published`, uses `PUT /api/schedule/shifts/[id]` with status change, audit logged
  - "View Details" - opens shift detail modal (read-only)

**Visual Styling:**
- Muted/greyed styling (light gray background, dashed border)
- Optional: Struck-through text
- Reduced opacity

## 7. Role + Status Constraints (Grid-Level)

### 7.1 Admin/Manager

**Full CRUD on draft/published/confirmed:**
- Can drag/move/reassign
- Can open modal to edit
- Can create/delete shifts

**Drag permission matrix:**
- Can drag draft shifts (yes)
- Can drag published shifts (yes)
- Can drag confirmed shifts (yes, audit logged on backend; UI allows it)
- Can drag ghost blocks (yes, must behave same as primary block)
- Cannot drag cancelled shifts (no)
- Can only drop into visible staff rows (filtered-out rows are not drop targets)

### 7.2 Staff

**View only by default.**

**If tenant setting enabled:** Staff can confirm/decline published shifts (status only).

**In grid, staff should NOT be able to drag shifts (never drag any shift, even their own).**

**If staff can accept/decline is enabled:**
- Show buttons on ShiftBlock: **Confirm** / **Decline** (published only)
- Buttons change status only (no other edits allowed)

### 7.3 Confirmed Shifts

**Admin/Manager:** Can edit (audit logged) — UI allows it.

**Staff:** Cannot change after confirmed.

### 7.4 Permissions Enforcement in UI (Don't Break UI)

**⚠️ Do not rely on "role in frontend" alone:**

- **UI disables actions based on role (UX hint only):** Disable drag/buttons to prevent invalid actions before API call
- **On 403 from any mutation:** Revert optimistic + toast: "Not allowed: you don't have permission."
- **Never show blocking error states or freeze the grid**
- **Client-side permission checks are UX hints only; server-side enforcement is authoritative**
- **Always handle 403 as a revert + toast, never as a blocking error state**
- Gracefully handle permission changes mid-session (if user role changes)

---

## 8. Header + Filtering

### 8.1 Header Components

**Week Navigation:**
- Previous week button (←)
- Next week button (→)
- Today button (jump to current week)
- Week label: "Dec 16 - Dec 22, 2024" (tenant timezone)

**Filters:**
- Location dropdown (filter by location)
- Department dropdown (filter by department)
- Staff search (filter by staff name)

**Toggles:**
- Show conflicts (highlight conflicts)
- Show availability (overlay availability)

**Actions:**
- Create shift button
- Bulk publish button (existing spec)

### 8.2 Staff Left Column (Row Header)

**Display:**
- Staff name + preferred name
- Department/location label (secondary text)
- Optional: Weekly hours summary (nice-to-have for V1)

**Sticky Behavior:**
- Staff column sticky left
- Day headers sticky top
- Grid scrolls smoothly both ways

**Example:**
```
┌─────────────────────┐
│ John Doe            │
│ (Johnny)            │
│ Sales • Main Office │
│ 40h this week       │ (optional)
└─────────────────────┘
```

---

## 9. Performance "Ship" Constraints

**Must handle:**
- 100 staff rows + hundreds of shifts without becoming laggy

**Required practices:**
- Memoize grouping and day bucketing
- Avoid re-grouping on every minor UI interaction
- Keep ShiftBlock lightweight
- Virtualization is allowed as a follow-up if needed, but don't block shipping on it

---

## 9. Component Architecture

### 9.1 New Component Structure

```
WeekPlannerPage
├── WeekPlannerHeader (existing, may need updates)
│   ├── WeekNavigation
│   ├── WeekDisplay
│   ├── FilterControls
│   └── ViewOptions
├── StaffRowScheduler (NEW - replaces WeekPlannerGrid)
│   ├── StaffRowHeader (sticky left column)
│   │   └── StaffRow (x N staff)
│   ├── DayHeaders (sticky top, 7 columns)
│   └── GridBody
│       ├── StaffRow (x N staff)
│       │   └── DayCell (x 7 days)
│       │       └── ShiftStack
│       │           └── ShiftBlock (x M shifts)
│       └── OvernightContinuationBlock (ghost blocks)
└── ShiftModal (existing, may need updates)
```

### 9.2 Key Components

**StaffRowScheduler:**
- Main grid component
- Handles layout, scrolling, sticky headers
- Manages drag/drop context

**StaffRow:**
- Single staff row
- Contains 7 DayCells
- Sticky left column (staff info)

**DayCell:**
- Single cell (staff × day)
- Drop zone for drag/drop
- Contains ShiftStack

**ShiftStack:**
- Vertical list of ShiftBlocks for one staff/day
- Handles stacking, scrolling if needed
- Manages "+X more" expansion (if implemented)

**ShiftBlock:**
- Individual shift display
- Shows time, location, status, warnings
- Handles click, drag, hover
- **Unique render key rule:** React key is always `shift.id` (and temp shifts use `temp_<uuid>`), never derived keys like `${staff_id}-${start_time}` (prevents flicker bugs)

**OvernightContinuationBlock:**
- Ghost block for overnight shift continuation
- Muted styling, "continues" text
- Same shift ID as primary block

### 9.3 Utility Functions

**Grouping Logic:**
```typescript
// lib/schedule/shift-grouping.ts
export function groupShiftsByStaffAndDay(
  shifts: Shift[],
  timezone: string,
  weekStart: Date
): Map<string, Map<number, Shift[]>>

export function getShiftDay(
  shift: Shift,
  timezone: string
): number // 0-6 (Mon-Sun)

export function isOvernight(
  shift: Shift,
  timezone: string
): boolean

export function getOvernightContinuationDay(
  shift: Shift,
  timezone: string
): number | null
```

**Timezone Utilities:**
```typescript
// lib/schedule/timezone-utils.ts
export function toTenantTimezone(
  utcTimestamp: string,
  timezone: string
): Date

export function getWeekStartInTimezone(
  weekStart: Date,
  timezone: string
): Date

export function formatTimeInTimezone(
  timestamp: string,
  timezone: string,
  format: string
): string
```

---

## 10. Data Flow

### 10.1 Fetching Shifts

1. **Initial Load:**
   - `useWeekShifts` hook fetches from `/api/schedule/week`
   - Returns `shifts[]` array (UTC timestamps)

2. **Grouping:**
   - Convert shifts to tenant timezone
   - Group by `staff_id` + `day` (0-6, Mon-Sun)
   - Handle overnight shifts (primary + ghost)

3. **Rendering:**
   - Render staff rows (from staff list)
   - For each staff, render 7 day cells
   - For each cell, render ShiftStack with grouped shifts

### 10.2 Optimistic Updates Flow

1. **User Action:**
   - User creates/updates/deletes/moves shift
   - Immediately update local state (optimistic)

2. **API Call:**
   - Send mutation request in background
   - Show subtle "syncing" indicator

3. **Success:**
   - Refetch affected data
   - Merge updates (no flicker)

4. **Error:**
   - Revert optimistic change
   - Show error toast

### 10.3 State Management

**Local State (React):**
- `shifts: Shift[]` (from API) - **Only real shifts, never ghost blocks**
- `groupedShifts: Map<staffId, Map<day, Shift[]>>` (computed)
- `optimisticShifts: Shift[]` (temporary, merged with real data) - **Only real shifts, never ghost blocks**
- `syncing: boolean` (for indicator)

**Computed Values:**
- Group shifts by staff/day (memoized)
- Detect overnight shifts (memoized)
- Map conflicts to shifts (memoized)
- **Ghost blocks are computed during render only, never stored in state**

**⚠️ REMINDER:** Ghost blocks are render-only projections computed from primary shifts. They must never be stored in state, included in optimistic updates, or sent in API payloads.

---

## 11. Implementation Order (Tight)

1. **Build StaffRowScheduler layout** (static grid + sticky headers)
2. **Implement grouping** (tenant timezone bucketing + overnight ghosts)
3. **Render ShiftStack in each cell** (stacked, scrollable)
4. **Implement click-to-create modal flow** (prefill staff/day)
5. **Add drag & drop move/reassign** (clock time preserved)
6. **Add optimistic state wrapper + syncing indicator + error toasts**
7. **Add warning icon rendering from conflicts[]**
8. **Add includeCancelled toggle and cancelled behavior constraints**
9. **QA pass with overnight + DST week + 409 overlap**

---

## 12. Acceptance Tests (Must Pass)

✅ **Ship if all are true:**

- [ ] No time axis rendered
- [ ] Multiple shifts same cell stack cleanly
- [ ] Overnight shows primary + ghost correctly
- [ ] Drag/drop changes day/staff correctly preserving clock time
- [ ] No blocking loading states after actions
- [ ] 409 overlap reverts + toast
- [ ] Warnings render without blocking save
- [ ] Cancelled hidden by default; can be shown only via includeCancelled

---

## 13. Testing Checklist

### 13.1 Layout Tests

- [ ] Staff rows render correctly
- [ ] Day columns render correctly (7 columns)
- [ ] No time column appears
- [ ] Sticky headers work (staff column left, day headers top)
- [ ] Grid scrolls smoothly

### 13.2 Shift Display Tests

- [ ] Single shift per day displays correctly
- [ ] Multiple shifts per day stack vertically (no overlap)
- [ ] ShiftBlock shows time range, location, status
- [ ] Overnight shifts show primary block + ghost block
- [ ] Cancelled shifts hidden by default
- [ ] Cancelled shifts shown when `includeCancelled=true` (muted)

### 13.3 Timezone Tests

- [ ] Week boundaries correct in tenant timezone
- [ ] Shifts grouped by correct day (tenant timezone)
- [ ] Times displayed in tenant timezone
- [ ] Overnight shifts detected correctly
- [ ] DST transitions handled correctly

### 13.4 Interaction Tests

- [ ] Click ShiftBlock opens edit modal
- [ ] Click empty cell opens create modal (pre-filled)
- [ ] Drag shift to different staff row (reassign)
- [ ] Drag shift to different day (change date)
- [ ] Drag staff to cell creates shift
- [ ] Drop validation works (overlap = revert + error)

### 13.5 Optimistic Updates Tests

- [ ] Create shift: UI updates instantly, no loading spinner
- [ ] Update shift: UI updates instantly
- [ ] Delete shift: UI updates instantly
- [ ] Move shift: UI updates instantly
- [ ] On error: Reverts optimistic change, shows toast
- [ ] On success: Refetches smoothly, no flicker
- [ ] Subtle syncing indicator appears

### 13.6 Conflict Tests

- [ ] Overlap conflict: 409 error, revert, error toast
- [ ] Availability warning: 200 OK, warning icon on ShiftBlock
- [ ] Working rule warning: 200 OK, warning icon on ShiftBlock
- [ ] Multiple conflicts: All warnings shown

### 13.7 Performance Tests

- [ ] Handles 50+ staff smoothly
- [ ] Handles 100+ shifts smoothly
- [ ] No lag on scroll
- [ ] No lag on drag/drop
- [ ] No excessive re-renders

---

## 14. Backend Contract (Unchanged)

**All API endpoints remain unchanged:**
- `GET /api/schedule/week` - Same request/response
- `POST /api/schedule/shifts` - Same request/response
- `PUT /api/schedule/shifts/[id]` - Same request/response
- `DELETE /api/schedule/shifts/[id]` - Same request/response
- `POST /api/schedule/shifts/bulk` - Same request/response

### 14.1 Week Endpoint Response Shape (Minimum Fields)

**`GET /api/schedule/week` must return:**

```typescript
{
  shifts: Array<{
    id: string
    staff_id: string
    start_time: string  // UTC TIMESTAMPTZ
    end_time: string   // UTC TIMESTAMPTZ
    location_id: string
    status: 'draft' | 'published' | 'confirmed' | 'cancelled'
    location: {
      id: string
      name: string  // Required for ShiftBlock "location short name" display
    } | null
    // ... other fields may exist but these are minimum required
  }>
  conflicts: Array<{
    shift_id: string
    type: string
    message: string
  }>
  weekStart: string  // YYYY-MM-DD
  weekEnd: string    // YYYY-MM-DD
}
```

**Critical:** Field names are snake_case (`start_time`, `end_time`, `staff_id`, `location_id`, `shift_id`), not camelCase. Do not guess alternative names.

**Location display field:**
- `shifts[].location.name` is required in the week endpoint response for ShiftBlock display
- If location is not included in response, you must have a location mapping available (from staff list or separate fetch) without extra API calls
- ShiftBlock requires "location short name" - use `location.name` directly or truncate if needed

**All business rules remain unchanged:**
- Validation rules
- Conflict detection
- Permissions
- Audit logging
- Status workflows

**Only the UI presentation layer changes.**

---

## 15. Deliverables

### 15.1 Components

- [ ] `StaffRowScheduler.tsx` - Main grid component
- [ ] `StaffRow.tsx` - Single staff row
- [ ] `DayCell.tsx` - Single cell (staff × day)
- [ ] `ShiftStack.tsx` - Vertical stack of shifts
- [ ] Updated `ShiftBlock.tsx` - Enhanced for new layout
- [ ] `OvernightContinuationBlock.tsx` - Ghost block for overnight shifts

### 15.2 Utilities

- [ ] `lib/schedule/shift-grouping.ts` - Grouping logic
- [ ] `lib/schedule/timezone-utils.ts` - Timezone helpers

### 15.3 Hooks

- [ ] `useOptimisticShifts.ts` - Optimistic updates wrapper

### 15.4 Documentation

- [ ] This README (detailed spec)
- [ ] Component prop documentation
- [ ] Usage examples

---

## 16. Known Limitations (V1)

1. **Row Virtualization:** Not implemented initially; add if performance degrades with 100+ staff
2. **"+X more" Expansion:** V1 uses scrollable cells; expand button is optional enhancement
3. **Bulk Drag:** Not supported in V1 (drag one shift at a time)
4. **Shift Resize:** Not supported in V1 (edit time via modal)
5. **Mobile View:** Desktop-first; mobile optimization is V2

---

## 17. Future Enhancements (V2+)

1. Row virtualization for 200+ staff
2. "+X more" expand button for cells with many shifts
3. Shift resize handles (drag to change duration)
4. Bulk drag (select multiple, drag together)
5. Mobile-optimized layout (swipe between days)
6. Print/export functionality
7. Color coding by location/department
8. Weekly hours summary in staff row header

---

**End of Specification**

