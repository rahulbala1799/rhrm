# Role-Based Drag and Drop Restrictions

## Overview

This document outlines the implementation plan for role-based restrictions on drag and drop operations in the weekly and daily schedulers. The core requirement is that shifts can only be moved between staff members who share the same role, preventing cross-role assignments through drag and drop.

## Current State

### Database Schema

**Shifts Table:**
- ✅ `role_id` (UUID, nullable) - Already exists via migration `20251220000000_add_job_roles_system.sql`
- Shifts can have an optional role assigned

**Staff Roles:**
- ✅ `staff_roles` junction table exists - Many-to-many relationship
- Staff members can have multiple roles assigned
- Roles are fetched via `/api/staff/[id]/roles`

**Job Roles Table:**
- ✅ `job_roles` table exists with `id`, `name`, `bg_color`, `text_color`, etc.

### Current Behavior

**Shift Creation/Editing:**
- When creating a shift via `ShiftModal`, if the selected staff has:
  - **0 roles**: Role dropdown shows "No roles assigned (optional)" - shift can be created without role
  - **1 role**: Role is auto-selected - shift gets that role
  - **2+ roles**: Role dropdown is shown and **required** - admin must select which role

**Drag and Drop:**
- Currently **NO role validation** on drag/drop
- Shifts can be moved to any staff member regardless of role
- Both daily and weekly schedulers support drag and drop

## Requirements

### Core Rule

**A shift with a role can only be dropped on a staff member who has that role.**

**Examples:**
1. **Chef shift → Chef staff**: ✅ Allowed (staff has Chef role)
2. **Chef shift → Waiter staff**: ❌ Blocked (staff doesn't have Chef role)
3. **Chef shift → Multi-role staff (Chef + Manager)**: ✅ Allowed (staff has Chef role)
4. **Shift with no role → Any staff**: ✅ Allowed (no role restriction)

### Role Validation Scope (Critical)

**Role validation MUST ONLY run when `staff_id` changes.**

**MUST NOT validate role when:**
- Moving a shift within the same staff (time/day change)
- Resizing a shift
- Dragging within the same staff row

**Implementation rule:**
- If `targetStaffId === originalStaffId`, skip role validation entirely.

**Why this matters:**
- Prevents accidental role blocks during refactors
- Makes drag logic easier to reason about
- Avoids false negatives during same-staff moves

### Edge Cases

1. **Shift has no role (`role_id` is null)**:
   - Can be dropped on any staff member
   - No restrictions apply

2. **Staff has no roles**:
   - Can only receive shifts with no role
   - Cannot receive shifts with a role

3. **Staff has multiple roles**:
   - Can receive shifts for any of their assigned roles
   - When creating a new shift for multi-role staff, admin must select role (already implemented)

4. **Shift role deleted/inactive**:
   - If shift has `role_id` but role no longer exists or is inactive:
     - Treat as "no role" for drag/drop purposes
     - Allow dropping on any staff member
     - Show warning in UI that role is missing

5. **Moving shift to same staff, different day**:
   - If only changing date/time (same staff), role check is not needed
   - Only validate when changing `staff_id`

## Implementation Approach

### Option 1: Validate at Drop Time (Recommended)

**Approach:** Check role compatibility when drop occurs, show visual feedback during drag.

**Pros:**
- Simple to implement
- Clear user feedback
- No need to pre-fetch all staff roles upfront

**Cons:**
- Requires fetching target staff's roles on hover/drop
- Slight delay for role validation

**Implementation:**
1. During drag, track which staff row is being hovered
2. When hovering over a staff row, fetch their roles (or use cached data)
3. Check if shift's `role_id` matches any of the target staff's roles
4. Show visual feedback:
   - ✅ Green highlight/border if valid drop
   - ❌ Red highlight/border if invalid drop
   - Show tooltip: "Cannot drop: Staff doesn't have [Role Name] role"
5. On drop, validate again and prevent drop if invalid

### Hover vs Drop Authority

**Hover validation is UX guidance only.**
**Drop validation is authoritative.**

**Rules:**
- Even if hover shows valid, drop MUST re-validate using fresh role data
- Drop MUST fail if validation fails at commit time
- Hover feedback is non-blocking preview only

**This protects you against:**
- Race conditions
- Role updates mid-drag
- Stale cache

### Option 2: Pre-fetch All Staff Roles

**Approach:** Load all staff roles when scheduler loads, validate in-memory.

**Pros:**
- Instant validation feedback
- No API calls during drag

**Cons:**
- More data to load upfront
- Need to keep in sync with role assignments
- More memory usage

**Implementation:**
1. On scheduler load, fetch all staff with their roles
2. Build a Map: `staffId → roleIds[]`
3. During drag, check against this map instantly
4. Show visual feedback immediately

### Recommended: Hybrid Approach

**Best of both worlds:**
1. Pre-fetch staff roles for visible staff (or all if < 100 staff)
2. Cache in React state/context
3. During drag, validate against cache
4. If staff not in cache, fetch on-demand
5. Invalidate cache when roles are updated

## Technical Implementation

### 1. Data Fetching

**New Hook: `useStaffRoles`**

```typescript
// apps/web/app/(dashboard)/schedule/hooks/useStaffRoles.ts

interface StaffRole {
  staffId: string
  roleIds: string[]
  roles: Array<{ id: string; name: string }>
}

export function useStaffRoles(staffIds: string[]) {
  // Fetch roles for all staff members
  // Cache results
  // Return Map<staffId, roleIds[]>
}
```

**API Endpoint Enhancement:**

Consider adding a bulk endpoint:
```
GET /api/staff/roles/bulk?staffIds=id1,id2,id3
```

Or fetch individually (current endpoint works):
```
GET /api/staff/[id]/roles
```

### 2. Drag Validation Logic

### Single Source of Truth (Mandatory)

**Role validation MUST live in a shared utility:**
`apps/web/lib/schedule/role-validation.ts`

**Daily and Weekly schedulers MUST call this function.**
**No inline role validation logic is allowed in components.**

**Function signature:**

```typescript
// apps/web/lib/schedule/role-validation.ts

interface CanDropShiftParams {
  shiftRoleId: string | null
  sourceStaffId: string
  targetStaffId: string
  targetStaffRoleIds: string[]
}

interface CanDropShiftParams {
  shiftRoleId: string | null
  sourceStaffId: string
  targetStaffId: string
  targetStaffRoleIds: string[]
  roleExists?: boolean // Optional: true if role exists in job_roles, false if deleted/inactive
}

interface CanDropShiftResult {
  allowed: boolean
  reason?: 'ROLE_MISMATCH' | 'NO_ROLES' | 'SAME_STAFF' | 'MISSING_ROLE'
}

export function canDropShift(params: CanDropShiftParams): CanDropShiftResult {
  const { shiftRoleId, sourceStaffId, targetStaffId, targetStaffRoleIds, roleExists } = params
  
  // CRITICAL: Skip validation if staff_id hasn't changed
  if (sourceStaffId === targetStaffId) {
    return { allowed: true, reason: 'SAME_STAFF' }
  }
  
  // If shift has no role, allow drop
  if (!shiftRoleId) {
    return { allowed: true }
  }
  
  // If role was deleted/inactive, treat as "no role" but flag it
  if (roleExists === false) {
    return { allowed: true, reason: 'MISSING_ROLE' }
  }
  
  // If staff has no roles, block drop
  if (targetStaffRoleIds.length === 0) {
    return { allowed: false, reason: 'NO_ROLES' }
  }
  
  // Check if target staff has the shift's role
  const hasRole = targetStaffRoleIds.includes(shiftRoleId)
  return {
    allowed: hasRole,
    reason: hasRole ? undefined : 'ROLE_MISMATCH'
  }
}
```

**Why this matters:**
- Prevents daily & weekly diverging
- Makes unit testing trivial
- Prevents "fixed in daily, broken in weekly" bugs

**Role Name Lookup for Tooltips:**

**Tooltip role names MUST come from cached `job_roles` list (by id), NOT from staff roles endpoint.**

**Implementation:**
- Cache all active `job_roles` when scheduler loads
- Lookup role name by `shiftRoleId` from cached `job_roles` Map
- Avoid extra fetches during drag operations
- If role not found in cache (deleted/inactive), show: "Role no longer exists"

**Example:**
```typescript
// Cache job_roles on load
const jobRolesMap = new Map<string, { id: string; name: string }>()
// ... populate from /api/settings/roles

// In tooltip generation
const roleName = jobRolesMap.get(shiftRoleId)?.name || 'Unknown Role'
const tooltip = `Cannot drop: ${staffName} doesn't have ${roleName} role`
```

### 3. Daily Scheduler Changes

**File: `apps/web/app/(dashboard)/schedule/day/components/DailyCanvas.tsx`**

**Changes needed:**
1. Fetch staff roles when component mounts
2. In drag preview calculation (around line 368), add role validation:
   ```typescript
   // CRITICAL: Only validate if staff_id changes
   const needsRoleCheck = finalStaffId !== dragState.originalStaffId
   let isValidRole = true
   let roleReason: 'ROLE_MISMATCH' | 'NO_ROLES' | 'MISSING_ROLE' | undefined
   
   if (needsRoleCheck) {
     const targetStaffRoles = staffRolesMap.get(finalStaffId) || []
     const roleExists = jobRolesMap.has(shift.role_id || '') // Check if role exists
     const roleValidation = canDropShift({
       shiftRoleId: shift.role_id,
       sourceStaffId: dragState.originalStaffId,
       targetStaffId: finalStaffId,
       targetStaffRoleIds: targetStaffRoles,
       roleExists: shift.role_id ? roleExists : undefined
     })
     isValidRole = roleValidation.allowed
     roleReason = roleValidation.reason
   }
   
   const isValid = !overlap.hasOverlap && isValidRole
   ```
3. Update `dragPreview` to include role validation result and reason
4. Show visual feedback:
   - Red border/background if role mismatch
   - Tooltip: "Cannot drop: [Staff Name] doesn't have [Role Name] role"
5. Prevent drop in `handleMouseUp` if role validation fails

**Visual Feedback:**
- Valid drop: Blue dashed border (existing)
- Invalid drop (overlap): Red dashed border (existing)
- Invalid drop (role): Orange/amber dashed border (new)
- Valid drop (missing role): Blue dashed border with warning badge (role no longer exists)
- Tooltip shows reason: "Role mismatch" vs "Overlaps existing shift" vs "Role no longer exists"

### Validation Priority Order

**When multiple validation errors exist, show them in this priority:**

1. **Role mismatch** (highest priority)
2. Overlap
3. Other constraints

**Implementation:**
- If role mismatch exists, tooltip MUST show role error first
- Overlap message may be secondary or combined
- Example: "Cannot drop: [Staff Name] doesn't have [Role Name] role. Also overlaps existing shift."

**Why:**
- Role mismatch is a hard business rule
- Overlap is a spatial constraint
- Users should know the primary reason it's blocked

### 4. Weekly Scheduler Changes

**File: `apps/web/app/(dashboard)/schedule/week/components/StaffRowScheduler.tsx`**

**Changes needed:**
1. Fetch staff roles when component mounts
2. Pass `staffRolesMap` to `StaffRow` component
3. In `handleDrop` (around line 178), validate role before calling `onShiftDrop`:
   ```typescript
   const roleValidation = canDropShift({
     shiftRoleId: shift.role_id,
     sourceStaffId: shift.staff_id,
     targetStaffId: targetStaffId,
     targetStaffRoleIds: staffRolesMap.get(targetStaffId) || [],
     roleExists: jobRolesMap.has(shift.role_id) // Check if role exists
   })
   
   if (!roleValidation.allowed) {
     // Show error toast, prevent drop
     // Keep original shift position, play shake animation on target cell
     return
   }
   ```
4. Show visual feedback during drag (similar to daily)

### Drop Cancel Behavior (Weekly Scheduler)

**On blocked drop:**
- Keep original shift position (no movement)
- Play shake animation on the dragged ghost/target cell
- Toast only after drop attempt (not during drag)
- Clear drag state immediately

**Implementation:**
- Similar to daily scheduler's snap-back/shake behavior
- Use CSS animation classes for shake effect
- Maintain shift in original position in DOM
- Only show toast on actual drop attempt failure

**File: `apps/web/app/(dashboard)/schedule/week/components/StaffRow.tsx`**

**Changes needed:**
1. Accept `staffRolesMap` prop
2. In drag handlers, check role compatibility using shared `canDropShift` function
3. Add `onDragOver` handler to show visual feedback (hover only, non-blocking)
4. Prevent drop if role mismatch (authoritative validation on drop)

**File: `apps/web/app/(dashboard)/schedule/week/components/DayCell.tsx`**

**Changes needed:**
1. Accept `staffRolesMap` and `shiftRoleId` props
2. In `onDragOver`, validate role
3. Add CSS classes for valid/invalid drop zones
4. Show tooltip on hover if invalid

### 5. Shift Creation via Drag

**Current behavior:** When dragging to create a new shift (empty cell), the shift is created without a role initially, then the modal opens.

**New behavior:**
- If target staff has **1 role**: Auto-assign that role when creating shift
- If target staff has **0 roles**: Create shift without role (existing behavior)
- If target staff has **2+ roles**: 
  - Option A: Create shift, open modal to select role
  - Option B: Block drag creation, require clicking cell to open modal first
  - **Recommendation: Option A** - Create shift, open modal (consistent with current UX)

### 6. Shift Movement Scenarios

**Scenario 1: Move shift to different staff (same role)**
- ✅ Allowed if target staff has the shift's role
- Update `staff_id`, keep `role_id` the same

**Scenario 2: Move shift to different staff (different role)**
- ❌ Blocked - show error: "Cannot move [Role Name] shift to [Staff Name] - they don't have this role"
- Shift returns to original position

**Scenario 3: Move shift to same staff, different time/day**
- ✅ Allowed - no role check needed (same staff)

**Scenario 4: Resize shift (same staff)**
- ✅ Allowed - no role check needed

## UI/UX Considerations

### Visual Feedback During Drag

**Valid Drop Zone:**
- Green border or highlight on staff row
- Tooltip: "Drop here to assign shift to [Staff Name]"

**Invalid Drop Zone (Role Mismatch):**
- Red/amber border or highlight on staff row
- Tooltip: "Cannot drop: [Staff Name] doesn't have [Role Name] role"
- Cursor: `not-allowed` or `no-drop`

**Invalid Drop Zone (Overlap):**
- Red border (existing behavior)
- Tooltip: "Overlaps existing shift"

**Combined Invalid (Role + Overlap):**
- Show role error first (priority), then overlap
- Red border
- Example tooltip: "Cannot drop: [Staff Name] doesn't have [Role Name] role. Also overlaps existing shift."

### Error Messages

**On Drop Attempt (Role Mismatch):**
- Toast notification: "Cannot move shift: [Staff Name] doesn't have [Role Name] role"
- Shift returns to original position with shake animation

**On Drop Attempt (No Role on Staff):**
- Toast: "Cannot assign shift with role to staff member who has no roles assigned"

**On Drop Attempt (Missing Role):**
- Toast: "Shift has a role that no longer exists. Role restriction removed."
- Drop allowed (treated as no role), but show warning badge on shift

### Accessibility

- Screen reader announcements: "Cannot drop shift - role mismatch"
- Keyboard navigation: Same restrictions apply
- Focus management: Maintain focus after failed drop

### Interaction Lock Integration

**During active drag:**
- Role validation runs continuously for preview only
- Role validation MUST NOT trigger toasts
- Errors/toasts only fire on drop attempt

**On Escape during drag:**
- Cancel drag
- Clear role validation state
- No toast shown

**This keeps drag feeling clean and non-naggy.**

## Edge Cases and Special Scenarios

### 1. Shift with Deleted Role

**Scenario:** Shift has `role_id` but the role was deleted or deactivated.

**Handling:**
- Validation returns `{ allowed: true, reason: 'MISSING_ROLE' }`
- Treat as "no role" for drop validation (allow dropping on any staff)
- Show warning badge on shift: "Role no longer exists"
- Show tooltip: "Shift has a role that no longer exists"
- Optionally allow admin to reassign role via edit modal
- UI consistently shows warning badge/tooltip when `reason === 'MISSING_ROLE'`

### 2. Staff Role Removed During Drag

**Scenario:** Admin removes a role from staff member while another admin is dragging a shift to them.

**Handling:**
- Validate on drop (not just on hover)
- If validation fails on drop, show error and prevent drop
- This is a race condition that's acceptable - the drop will fail gracefully

### 3. Shift Created Without Role, Then Role Added to Staff

**Scenario:** Shift has no role, staff gets a role assigned later.

**Handling:**
- Shift remains without role (no automatic assignment)
- Shift can still be moved to any staff (no role restriction)
- Admin can manually assign role via edit modal

### 4. Multi-Role Staff Receiving Shift

**Scenario:** Staff has [Chef, Manager] roles, shift has Chef role.

**Handling:**
- ✅ Allow drop (staff has Chef role)
- Keep shift's role as Chef (don't change it)
- If admin wants to change role, they can edit the shift

### 5. Changing Shift Role After Assignment

**Scenario:** Admin edits shift and changes its role to one the staff member doesn't have.

**Handling:**
- **Option A:** Block role change in modal if staff doesn't have that role
- **Option B:** Allow role change, but show warning
- **Recommendation: Option A** - Prevent invalid state

**Implementation in ShiftModal:**
- When role is selected, validate against staff's roles
- If invalid, show error: "This staff member doesn't have [Role Name] role"
- Disable save button until valid role selected

## Database Considerations

### No Schema Changes Required

- ✅ `shifts.role_id` already exists
- ✅ `staff_roles` junction table already exists
- ✅ `job_roles` table already exists

### Query Performance

**Optimization:**
- Index on `shifts.role_id` (already exists)
- Index on `staff_roles.staff_id` (already exists)
- Consider composite index on `staff_roles(tenant_id, staff_id, role_id)` if not exists

**Bulk Role Fetching:**
```sql
SELECT 
  sr.staff_id,
  array_agg(sr.role_id) as role_ids
FROM staff_roles sr
WHERE sr.staff_id = ANY($1::uuid[])
  AND sr.tenant_id = $2
GROUP BY sr.staff_id
```

## Testing Checklist

### Unit Tests
- [ ] `canDropShift` function with all edge cases
- [ ] Role validation logic (shared utility)
- [ ] Multi-role staff scenarios
- [ ] Same-staff skip validation (critical)
- [ ] Validation priority order
- [ ] MISSING_ROLE reason handling
- [ ] Role name lookup from cached job_roles

### Integration Tests
- [ ] Daily scheduler drag/drop with role restrictions
- [ ] Weekly scheduler drag/drop with role restrictions
- [ ] Shift creation via drag with role assignment
- [ ] Shift movement between staff with same role
- [ ] Blocked drop with appropriate error message

### Manual Testing
- [ ] Drag Chef shift to Chef staff → ✅ Allowed
- [ ] Drag Chef shift to Waiter staff → ❌ Blocked
- [ ] Drag Chef shift to multi-role staff (Chef + Manager) → ✅ Allowed
- [ ] Drag shift with no role to any staff → ✅ Allowed
- [ ] Drag shift to staff with no roles → Only if shift has no role
- [ ] Create shift via drag on multi-role staff → Modal opens for role selection
- [ ] Resize shift (same staff) → ✅ Allowed (no role check)
- [ ] Move shift to same staff, different day → ✅ Allowed (no role check)
- [ ] Visual feedback during drag (green/red borders)
- [ ] Error messages on failed drop
- [ ] Missing role handling (warning badge, tooltip)
- [ ] Weekly scheduler drop cancel behavior (shake animation, toast on drop)
- [ ] Role name lookup from cached job_roles (not staff roles endpoint)
- [ ] Accessibility (screen reader, keyboard)

## Migration Strategy

### Backward Compatibility

**Existing Shifts:**
- Shifts without `role_id` continue to work (no restrictions)
- Shifts with `role_id` get role-based restrictions

**Existing Staff:**
- Staff without roles can only receive shifts without roles
- No breaking changes for existing functionality

### Rollout Plan

1. **Phase 1:** Implement validation logic (backend + frontend)
2. **Phase 2:** Add visual feedback during drag
3. **Phase 3:** Add error messages and tooltips
4. **Phase 4:** Update documentation
5. **Phase 5:** User testing and feedback

## Open Questions

1. **Should we allow dropping a shift with a role on staff with no roles if admin confirms?**
   - **Recommendation:** No - keep strict validation. Admin can edit shift to remove role first.

2. **Should we auto-assign role when creating shift via drag on single-role staff?**
   - **Recommendation:** Yes - consistent with current ShiftModal behavior

3. **What happens if admin changes staff's roles while viewing scheduler?**
   - **Recommendation:** Invalidate role cache and refetch silently. No blocking loading states allowed.

4. **Should we show role badges on staff rows in scheduler?**
   - **Recommendation:** Optional enhancement - show role badges to help admins understand restrictions

5. **What about bulk operations (copy/paste shifts)?**
   - **Recommendation:** Apply same role validation to bulk operations

## Summary

This implementation will add role-based restrictions to drag and drop operations while maintaining backward compatibility with shifts that have no role assigned. The validation will be clear and provide immediate visual feedback to prevent invalid assignments.

**Key Points:**
- ✅ Shifts already have `role_id` field
- ✅ Staff can have multiple roles
- ✅ Validation happens at drop time with visual feedback
- ✅ **Role validation ONLY when `staff_id` changes** (critical rule)
- ✅ **Single source of truth** - shared validation function (mandatory)
- ✅ **Hover is guidance, drop is authoritative** (prevents race conditions)
- ✅ **Validation priority: Role > Overlap** (clear UX)
- ✅ **Interaction lock integration** (no toasts during drag)
- ✅ Shifts without roles have no restrictions
- ✅ Multi-role staff can receive shifts for any of their roles
- ✅ Clear error messages guide admins

**Impact:**
- Daily scheduler: Role validation in drag preview and drop handler
- Weekly scheduler: Role validation in drag/drop handlers
- ShiftModal: Already handles role selection correctly
- No database changes required

