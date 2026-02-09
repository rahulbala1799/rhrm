# Locations Loading / "No Locations" Flash Issue

## What’s happening

In the **Week planner**, **Day view**, and other forms, the UI can briefly show **“no locations”** (or an empty location dropdown) before the locations data arrives from the API. Users see the empty state first, then it updates when the request completes. This looks like a bug even when locations exist.

There are **two separate causes**; both are about **timing between render and API response**.

---

## 1. Tenant locations list (page-level)

**Where:** Week planner (`week/page.tsx`), Day view (`day/page.tsx`), New staff (`staff/new/page.tsx`), Staff filters (`StaffFilters.tsx`), Settings locations page, etc.

**Flow:**

- Page mounts with `locationList` (or `locations`) initialised to `[]`.
- A `useEffect` runs and calls `fetch('/api/settings/locations')` (and often `fetch('/api/staff?...')` in parallel).
- Until the locations response comes back, `locationList` stays `[]`.
- Any component that uses `locationList` (e.g. `ShiftModal` via `locationList` prop, or a location dropdown) sees an empty list and can show “no locations” or an empty dropdown.

**Relevant code:**

- **Week planner:** `apps/web/app/(dashboard)/schedule/week/page.tsx`  
  - `locationList` state (line ~46), `fetchLocations()` in `useEffect` (lines ~178–198), passed as `locationList={locationList}` to `ShiftModal` (line ~632).
- **Day view:** `apps/web/app/(dashboard)/schedule/day/page.tsx`  
  - Same pattern: `locationList` state, `fetchLocations()` in `useEffect`, passed to `ShiftModal`.
- **New staff:** `apps/web/app/(dashboard)/staff/new/page.tsx`  
  - `locations` state, `fetchLocations()` in `useEffect`; dropdown is empty until load completes.

So: **before the API returns, the UI treats “no data yet” the same as “no locations exist”.**

---

## 2. Staff-specific locations in ShiftModal (per-staff API delay)

**Where:** Shift create/edit modal used in Week and Day views.

**Flow:**

- User opens the shift modal and selects (or already has) a staff member.
- Modal runs `fetchStaffRolesAndLocations(staffId)` which:
  - Calls `GET /api/staff/${staffId}/roles`
  - Calls `GET /api/staff/${staffId}/locations`
- Until the **staff locations** response returns, `staffLocations` is `[]`.
- The location block in the modal shows **“No locations assigned to this staff member. Please assign locations in their profile.”** whenever `staffLocations.length === 0 && formData.staff_id`.
- There is **no check for loading**: the same message is shown while the request is in flight and when the staff truly has no locations.

**Relevant code:**

- **ShiftModal:** `apps/web/app/(dashboard)/schedule/week/components/ShiftModal.tsx`
  - `staffLocations` state (line ~52), `loadingStaffData` set true/false around the fetch (lines ~67, 118).
  - Location block (lines ~293–324): shows the “No locations assigned…” message when `staffLocations.length === 0 && formData.staff_id` **without** using `loadingStaffData`.
  - So during the delay between “staff selected” and “locations API returned”, the user always sees “no locations”.

So: **the modal doesn’t distinguish “still loading” from “loaded and empty”.**

---

## Summary table

| Source              | Data                  | API                           | Where it’s used                    | Problem                                      |
|---------------------|-----------------------|--------------------------------|------------------------------------|---------------------------------------------|
| Page-level          | Tenant locations      | `GET /api/settings/locations`  | Week/day pages, New staff, filters | Empty list until response → “no locations”  |
| ShiftModal          | Staff locations       | `GET /api/staff/[id]/locations`| Shift create/edit modal           | No loading state → “no locations” while loading |

---

## Implemented solution (LocationsProvider + loading gate)

The fix addresses the cause instead of patching each consumer with loading booleans.

### 1. LocationsProvider at dashboard layout level

- **Pattern:** Same as `CurrencyContext`: tenant-scoped, rarely-changing data provided once at layout level.
- **Implementation:**
  - **`contexts/LocationsContext.tsx`** — Provides `{ locations, refetch }`. Accepts `initialLocations` so the layout can pass data that was fetched in the gate.
  - **`(dashboard)/layout.tsx`** — Fetches **role and locations in parallel** in the same gate that already showed a loading spinner. By the time `setLoading(false)` runs, both are ready. Children render inside `<LocationsProvider initialLocations={locations}>`.
- **Result:** Week, day, new-staff, filters, and ShiftModal (via `locationList` prop) get locations from context. No per-page fetch, no flash of empty list. Single source of truth; one fetch, one cache.

### 2. Consumers use `useLocations()`

- **Week planner** (`schedule/week/page.tsx`) — Removed `locationList` state and `fetchLocations`. Uses `const { locations: locationList } = useLocations()` and passes it to `ShiftModal`.
- **Day view** (`schedule/day/page.tsx`) — Same: `useLocations()` for `locationList`, no local fetch.
- **New staff** (`staff/new/page.tsx`) — Uses `useLocations()` for the location dropdown; no local fetch or loading state.
- **Staff filters** (`staff/components/StaffFilters.tsx`) — Uses `useLocations()`; removed local fetch and `loadingLocations`.
- **Settings locations page** (`settings/locations/page.tsx`) — Uses `useLocations()` for the list. After create/update/delete, calls `refetch()` so the global list (and all consumers) stay in sync. No initial loading spinner (data is already in context).
- **LocationsTab** (`staff/[id]/components/LocationsTab.tsx`) — Uses `useLocations()` for `allLocations` (assign-location dropdown); still fetches staff-specific locations from `/api/staff/[id]/locations`.

### 3. ShiftModal: gate “No locations assigned” on `loadingStaffData`

- Staff-specific locations are per-staff, not tenant-wide, so they stay as a separate fetch in the modal.
- **Change:** The location block now checks `loadingStaffData`. When true and a staff is selected, it shows “Loading locations…” instead of “No locations assigned…”. “No locations assigned…” and the helper text only render when `!loadingStaffData && staffLocations.length === 0 && formData.staff_id`. So the false-negative during the API delay is removed with a small, local change.

### Summary

- **Cause 1 (tenant locations):** Solved by fetching locations in the layout gate and providing them via `LocationsProvider`. No duplicate requests, no flash on any dashboard page.
- **Cause 2 (staff locations in ShiftModal):** Solved by gating the “no locations” message on `!loadingStaffData`, and showing “Loading locations…” while the staff-locations request is in flight.
- **Files changed:** `contexts/LocationsContext.tsx` (new), `layout.tsx`, `schedule/week/page.tsx`, `schedule/day/page.tsx`, `schedule/week/components/ShiftModal.tsx`, `staff/new/page.tsx`, `staff/components/StaffFilters.tsx`, `settings/locations/page.tsx`, `staff/[id]/components/LocationsTab.tsx`.
