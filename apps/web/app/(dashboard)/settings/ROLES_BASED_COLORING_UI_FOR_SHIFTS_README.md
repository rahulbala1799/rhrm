# Roles-Based Color Coding UI for Shifts

**Status:** Specification  
**Date:** 2025  
**Goal:** Implement job roles system with color-coded shift blocks in the scheduler, allowing admins to create roles, assign them to staff, and customize colors per role.

---

## 0. Ship-Ready Decisions (Lock These)

### D0.1 Role Assignment Model
- **Many-to-many relationship:** Staff can have multiple roles, roles can be assigned to multiple staff
- **Junction table:** `staff_roles` with `staff_id` and `role_id`
- **Role uniqueness:** Role names must be unique per tenant (case-insensitive)

### D0.2 Color Storage
- **Background color:** Stored as hex code (e.g., `#FF5733`)
- **Text color:** Stored as hex code (e.g., `#FFFFFF`)
- **Default colors:** If no colors set, use system defaults (light gray bg, dark gray text)
- **Color validation:** Must be valid hex codes (6 digits, optional `#` prefix)

### D0.3 Auto-Selection Rules
- **Single role:** Auto-select role in shift creation (no dropdown shown)
- **Multiple roles:** Show role selector dropdown (required field)
- **No roles:** Show role selector dropdown (required field, admin must assign role)
- **Single location:** Auto-select location in shift creation (no dropdown shown)
- **Multiple locations:** Show location selector dropdown (required field)
- **No locations:** Show location selector dropdown (required field)

### D0.4 Shift Block Color Display
- **Color source:** Use role's `bg_color` and `text_color` from `job_roles` table
- **Fallback:** If role not found or colors not set, use system defaults
- **Priority:** Role colors override any other styling

### D0.5 Role Management Permissions
- **Create/Edit/Delete roles:** Admin and Manager only
- **Assign roles to staff:** Admin and Manager only
- **View roles:** All authenticated users (for shift display)

---

## 1. Database Schema

### 1.1 Job Roles Table

```sql
CREATE TABLE IF NOT EXISTS job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    bg_color TEXT NOT NULL DEFAULT '#E5E7EB', -- Hex color code
    text_color TEXT NOT NULL DEFAULT '#1F2937', -- Hex color code
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, LOWER(name)) -- Case-insensitive unique role names per tenant
);

CREATE INDEX IF NOT EXISTS idx_job_roles_tenant_id ON job_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_roles_is_active ON job_roles(tenant_id, is_active) WHERE is_active = true;
```

**Fields:**
- `id`: Primary key
- `tenant_id`: Tenant scope
- `name`: Role name (e.g., "Chef", "Waiter", "Manager")
- `description`: Optional description
- `bg_color`: Background color hex code (default: light gray)
- `text_color`: Text color hex code (default: dark gray)
- `is_active`: Soft delete flag (inactive roles hidden from assignment but preserved for historical shifts)

### 1.2 Staff Roles Junction Table

```sql
CREATE TABLE IF NOT EXISTS staff_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id),
    UNIQUE(tenant_id, staff_id, role_id) -- Prevent duplicate assignments
);

CREATE INDEX IF NOT EXISTS idx_staff_roles_staff_id ON staff_roles(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_roles_role_id ON staff_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_staff_roles_tenant_id ON staff_roles(tenant_id);
```

**Fields:**
- `id`: Primary key
- `tenant_id`: Tenant scope
- `staff_id`: Staff member reference
- `role_id`: Role reference
- `assigned_at`: Timestamp of assignment
- `assigned_by`: User who made the assignment

### 1.3 Shifts Table Update

```sql
-- Add role_id column to shifts table
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES job_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shifts_role_id ON shifts(role_id);
```

**Fields:**
- `role_id`: Optional reference to job role (nullable for backward compatibility)

---

## 2. RLS Policies

### 2.1 Job Roles RLS

```sql
-- Enable RLS
ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view active roles in their tenant
CREATE POLICY "Users can view active job roles in their tenant"
ON job_roles FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM memberships 
        WHERE user_id = auth.uid() AND status = 'active'
    )
    AND is_active = true
);

-- Policy: Admins and Managers can manage roles
CREATE POLICY "Admins and Managers can manage job roles"
ON job_roles FOR ALL
USING (
    tenant_id IN (
        SELECT tenant_id FROM memberships 
        WHERE user_id = auth.uid() 
        AND status = 'active'
        AND role IN ('admin', 'manager')
    )
);
```

### 2.2 Staff Roles RLS

```sql
-- Enable RLS
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view staff role assignments in their tenant
CREATE POLICY "Users can view staff roles in their tenant"
ON staff_roles FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM memberships 
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

-- Policy: Admins and Managers can manage staff role assignments
CREATE POLICY "Admins and Managers can manage staff roles"
ON staff_roles FOR ALL
USING (
    tenant_id IN (
        SELECT tenant_id FROM memberships 
        WHERE user_id = auth.uid() 
        AND status = 'active'
        AND role IN ('admin', 'manager')
    )
);
```

---

## 3. API Endpoints

### 3.1 Job Roles Endpoints

#### `GET /api/settings/job-roles`
**Description:** Get all active job roles for the tenant

**Response:**
```json
{
  "roles": [
    {
      "id": "uuid",
      "name": "Chef",
      "description": "Kitchen staff",
      "bg_color": "#FF5733",
      "text_color": "#FFFFFF",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### `POST /api/settings/job-roles`
**Description:** Create a new job role

**Request Body:**
```json
{
  "name": "Chef",
  "description": "Kitchen staff",
  "bg_color": "#FF5733",
  "text_color": "#FFFFFF"
}
```

**Response:**
```json
{
  "role": {
    "id": "uuid",
    "name": "Chef",
    "description": "Kitchen staff",
    "bg_color": "#FF5733",
    "text_color": "#FFFFFF",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Validation:**
- `name`: Required, 1-100 characters, unique per tenant (case-insensitive)
- `description`: Optional, max 500 characters
- `bg_color`: Required, valid hex color (6 digits, optional `#`)
- `text_color`: Required, valid hex color (6 digits, optional `#`)

**Errors:**
- `400`: Validation error
- `409`: Role name already exists
- `403`: Not authorized (not admin/manager)

#### `PUT /api/settings/job-roles/[id]`
**Description:** Update a job role

**Request Body:** Same as POST (all fields optional except validation rules)

**Response:** Updated role object

**Errors:**
- `404`: Role not found
- `400`: Validation error
- `409`: Role name already exists (if name changed)
- `403`: Not authorized

#### `DELETE /api/settings/job-roles/[id]`
**Description:** Soft delete a job role (set `is_active = false`)

**Response:**
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

**Errors:**
- `404`: Role not found
- `403`: Not authorized
- `409`: Role is assigned to staff (must unassign first, or provide `force=true` to soft delete)

### 3.2 Staff Roles Endpoints

#### `GET /api/staff/[id]/roles`
**Description:** Get all roles assigned to a staff member

**Response:**
```json
{
  "roles": [
    {
      "id": "uuid",
      "name": "Chef",
      "bg_color": "#FF5733",
      "text_color": "#FFFFFF",
      "assigned_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### `POST /api/staff/[id]/roles`
**Description:** Assign a role to a staff member

**Request Body:**
```json
{
  "role_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role assigned successfully",
  "staff_role": {
    "id": "uuid",
    "staff_id": "uuid",
    "role_id": "uuid",
    "assigned_at": "2025-01-01T00:00:00Z"
  }
}
```

**Errors:**
- `400`: Validation error
- `404`: Staff or role not found
- `409`: Role already assigned
- `403`: Not authorized

#### `DELETE /api/staff/[id]/roles/[roleId]`
**Description:** Unassign a role from a staff member

**Response:**
```json
{
  "success": true,
  "message": "Role unassigned successfully"
}
```

**Errors:**
- `404`: Staff role assignment not found
- `403`: Not authorized

#### `PUT /api/staff/[id]/roles`
**Description:** Replace all roles for a staff member (bulk update)

**Request Body:**
```json
{
  "role_ids": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Roles updated successfully",
  "roles": [
    {
      "id": "uuid",
      "name": "Chef",
      "bg_color": "#FF5733",
      "text_color": "#FFFFFF"
    }
  ]
}
```

### 3.3 Shifts Endpoint Updates

#### `POST /api/schedule/shifts` (Updated)
**Request Body:** Add optional `role_id` field

```json
{
  "staff_id": "uuid",
  "location_id": "uuid",
  "role_id": "uuid", // NEW: Optional, but required if staff has multiple roles
  "start_time": "2025-01-01T09:00:00Z",
  "end_time": "2025-01-01T17:00:00Z",
  "break_duration_minutes": 30,
  "status": "draft",
  "notes": "Optional notes"
}
```

**Validation:**
- If staff has 1 role: `role_id` is optional (auto-filled)
- If staff has 2+ roles: `role_id` is required
- If staff has 0 roles: `role_id` is optional (but shift should still be creatable)

#### `GET /api/schedule/week` (Updated)
**Response:** Include `role` object in shift response

```json
{
  "shifts": [
    {
      "id": "uuid",
      "staff_id": "uuid",
      "location_id": "uuid",
      "role_id": "uuid", // NEW
      "role": { // NEW
        "id": "uuid",
        "name": "Chef",
        "bg_color": "#FF5733",
        "text_color": "#FFFFFF"
      },
      "start_time": "2025-01-01T09:00:00Z",
      "end_time": "2025-01-01T17:00:00Z",
      // ... other fields
    }
  ]
}
```

---

## 4. UI Components

### 4.1 Settings Page - Job Roles Tab

**Location:** `/settings` → New tab: "Job Roles"

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Settings > Job Roles                                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ [+ Create Role]                                          │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ Role Name        │ Colors        │ Actions        │  │
│ ├─────────────────────────────────────────────────────┤  │
│ │ Chef             │ 🟥 #FF5733    │ [Edit] [Delete]│  │
│ │                  │ ⚪ #FFFFFF    │                 │  │
│ ├─────────────────────────────────────────────────────┤  │
│ │ Waiter           │ 🟦 #3498DB    │ [Edit] [Delete]│  │
│ │                  │ ⚪ #FFFFFF    │                 │  │
│ └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- **Create Role Button:** Opens modal to create new role
- **Role List:** Table showing all active roles
- **Color Preview:** Visual color swatch + hex code
- **Edit Button:** Opens edit modal
- **Delete Button:** Soft deletes role (with confirmation if assigned to staff)

**Create/Edit Role Modal:**
```
┌─────────────────────────────────────┐
│ Create Role                    [×] │
├─────────────────────────────────────┤
│                                     │
│ Role Name *                         │
│ [________________________]          │
│                                     │
│ Description (optional)              │
│ [________________________]          │
│                                     │
│ Background Color *                  │
│ [Color Picker] #FF5733             │
│                                     │
│ Text Color *                        │
│ [Color Picker] #FFFFFF             │
│                                     │
│ [Cancel]  [Create Role]            │
└─────────────────────────────────────┘
```

**Color Picker:**
- Use HTML5 `<input type="color">` for simplicity
- Display hex code input field for manual entry
- Show live preview of colors

### 4.2 Staff Detail Page - Roles Section

**Location:** `/staff/[id]` → New section: "Job Roles"

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Staff Detail > John Doe                                  │
├─────────────────────────────────────────────────────────┤
│ ... other sections ...                                   │
│                                                           │
│ Job Roles                                                 │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ [+ Assign Role]                                      │  │
│ │                                                       │  │
│ │ Assigned Roles:                                       │  │
│ │ ┌─────────────────────────────────────────────────┐  │  │
│ │ │ 🟥 Chef                    [Remove]            │  │  │
│ │ └─────────────────────────────────────────────────┘  │  │
│ │ ┌─────────────────────────────────────────────────┐  │  │
│ │ │ 🟦 Waiter                  [Remove]            │  │  │
│ │ └─────────────────────────────────────────────────┘  │  │
│ └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- **Assign Role Button:** Opens dropdown/modal to select role
- **Role Cards:** Display assigned roles with color swatch
- **Remove Button:** Unassigns role (with confirmation if role used in shifts)

**Assign Role Modal/Dropdown:**
- Show all active roles (excluding already assigned)
- Multi-select if needed, or single select with "Add Another" option
- Display color preview for each role

### 4.3 Shift Creation Modal - Role Selection

**Location:** Shift creation modal (existing)

**Updates:**
- **Auto-selection logic:**
  - If staff has 1 role: Pre-fill `role_id`, hide role selector
  - If staff has 2+ roles: Show role selector dropdown (required)
  - If staff has 0 roles: Show role selector dropdown (optional, but recommended)

- **Location auto-selection (existing, enhance):**
  - If staff has 1 location: Pre-fill `location_id`, hide location selector
  - If staff has 2+ locations: Show location selector dropdown (required)
  - If staff has 0 locations: Show location selector dropdown (required)

**Modal Layout (Updated):**
```
┌─────────────────────────────────────┐
│ Create Shift                    [×] │
├─────────────────────────────────────┤
│                                     │
│ Staff *                             │
│ [John Doe ▼]                        │
│                                     │
│ Role * (if 2+ roles)                │
│ [Chef ▼]                            │
│                                     │
│ Location * (if 2+ locations)        │
│ [Main Location ▼]                   │
│                                     │
│ Start Time *                         │
│ [Date] [Time]                       │
│                                     │
│ End Time *                           │
│ [Date] [Time]                       │
│                                     │
│ [Cancel]  [Create Shift]            │
└─────────────────────────────────────┘
```

### 4.4 Scheduler - Color-Coded Shift Blocks

**Location:** Weekly scheduler (`/schedule/week`)

**Updates to ShiftBlock Component:**
- **Color Application:**
  - Use `shift.role.bg_color` for background
  - Use `shift.role.text_color` for text
  - Fallback to system defaults if role/colors not available

**ShiftBlock Styling:**
```tsx
const bgColor = shift.role?.bg_color || '#E5E7EB'
const textColor = shift.role?.text_color || '#1F2937'

<div
  className="rounded-lg border-2 p-2"
  style={{
    backgroundColor: bgColor,
    color: textColor,
    borderColor: bgColor, // Optional: match border to bg
  }}
>
  {/* Shift content */}
</div>
```

**Visual Example:**
```
┌─────────────────────────────────────────────────────────┐
│ Staff │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │      │
├───────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤      │
│ John  │     │ 🟥  │ 🟥  │     │ 🟦  │     │     │      │
│ Doe   │     │Chef │Chef │     │Wait │     │     │      │
│       │     │09-17│09-17│     │09-17│     │     │      │
└───────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘      │
```

---

## 5. Business Logic

### 5.1 Role Assignment Rules

1. **Staff can have multiple roles:** No limit (practical limit: 5-10 for UX)
2. **Role uniqueness per staff:** Cannot assign same role twice
3. **Role deletion:** Soft delete only (preserve for historical shifts)
4. **Role assignment audit:** Track `assigned_by` and `assigned_at`

### 5.2 Shift Creation Logic

**Role Selection:**
```typescript
function getRoleSelectionMode(staffRoles: Role[]): 'hidden' | 'required' | 'optional' {
  if (staffRoles.length === 0) return 'optional' // Allow shift without role
  if (staffRoles.length === 1) return 'hidden' // Auto-select
  return 'required' // Must select
}
```

**Location Selection (enhance existing):**
```typescript
function getLocationSelectionMode(staffLocations: Location[]): 'hidden' | 'required' {
  if (staffLocations.length === 0) return 'required' // Must have location
  if (staffLocations.length === 1) return 'hidden' // Auto-select
  return 'required' // Must select
}
```

### 5.3 Color Application Rules

1. **Priority:** Role colors > System defaults
2. **Validation:** Ensure sufficient contrast (WCAG AA minimum)
3. **Fallback:** If role deleted or colors invalid, use system defaults
4. **Consistency:** Same role always shows same colors across all shifts

### 5.4 Data Migration

**Existing Shifts:**
- `role_id` is nullable (backward compatible)
- Shifts without `role_id` use system default colors
- Admin can optionally backfill `role_id` for existing shifts

---

## 6. Implementation Order

### Phase 1: Database & API
1. Create `job_roles` table migration
2. Create `staff_roles` junction table migration
3. Add `role_id` column to `shifts` table migration
4. Create RLS policies
5. Implement `GET /api/settings/job-roles`
6. Implement `POST /api/settings/job-roles`
7. Implement `PUT /api/settings/job-roles/[id]`
8. Implement `DELETE /api/settings/job-roles/[id]`
9. Implement `GET /api/staff/[id]/roles`
10. Implement `POST /api/staff/[id]/roles`
11. Implement `DELETE /api/staff/[id]/roles/[roleId]`
12. Update `POST /api/schedule/shifts` to accept `role_id`
13. Update `GET /api/schedule/week` to include role data

### Phase 2: Settings UI
1. Add "Job Roles" tab to Settings page
2. Create `JobRolesList` component
3. Create `CreateRoleModal` component
4. Create `EditRoleModal` component
5. Implement role list display
6. Implement create role flow
7. Implement edit role flow
8. Implement delete role flow (with validation)

### Phase 3: Staff Detail UI
1. Add "Job Roles" section to staff detail page
2. Create `StaffRolesSection` component
3. Create `AssignRoleModal` component
4. Implement role assignment display
5. Implement assign role flow
6. Implement remove role flow

### Phase 4: Shift Creation UI
1. Update `ShiftModal` component
2. Add role selection logic (auto-select vs. dropdown)
3. Enhance location selection logic (auto-select vs. dropdown)
4. Fetch staff roles when staff selected
5. Update shift creation API call to include `role_id`

### Phase 5: Scheduler Display
1. Update `ShiftBlock` component to use role colors
2. Update `Shift` interface to include `role` object
3. Apply colors to shift blocks
4. Test color contrast and readability
5. Add fallback for shifts without roles

### Phase 6: Testing & Polish
1. Test role creation/editing/deletion
2. Test role assignment to staff
3. Test shift creation with various role scenarios
4. Test color display in scheduler
5. Test edge cases (no roles, deleted roles, etc.)
6. Accessibility testing (color contrast)
7. Performance testing (many roles, many staff)

---

## 7. Acceptance Criteria

### ✅ Role Management
- [ ] Admin can create job roles with name, description, and colors
- [ ] Admin can edit job roles (name, description, colors)
- [ ] Admin can soft delete job roles
- [ ] Role names are unique per tenant (case-insensitive)
- [ ] Color validation works (valid hex codes)

### ✅ Staff Role Assignment
- [ ] Admin can assign multiple roles to a staff member
- [ ] Admin can remove roles from staff
- [ ] Staff role assignments are displayed in staff detail page
- [ ] Cannot assign duplicate roles to same staff

### ✅ Shift Creation
- [ ] If staff has 1 role: role auto-selected, no dropdown shown
- [ ] If staff has 2+ roles: role dropdown shown and required
- [ ] If staff has 0 roles: role dropdown shown (optional)
- [ ] If staff has 1 location: location auto-selected, no dropdown shown
- [ ] If staff has 2+ locations: location dropdown shown and required
- [ ] Shift creation includes `role_id` in API call

### ✅ Scheduler Display
- [ ] Shift blocks display in role's assigned colors
- [ ] Text is readable (sufficient contrast)
- [ ] Shifts without roles use system default colors
- [ ] Color consistency across all shifts for same role
- [ ] Colors update immediately when role colors changed

### ✅ Data Integrity
- [ ] RLS policies prevent unauthorized access
- [ ] Soft delete preserves historical shifts
- [ ] Foreign key constraints prevent orphaned records
- [ ] Audit trail for role assignments

---

## 8. Testing Checklist

### Unit Tests
- [ ] Role creation validation
- [ ] Role name uniqueness check
- [ ] Color validation (hex codes)
- [ ] Auto-selection logic (1 role, 2+ roles, 0 roles)
- [ ] Location auto-selection logic

### Integration Tests
- [ ] Create role → Assign to staff → Create shift → Verify colors
- [ ] Assign multiple roles → Create shift → Verify role selector shown
- [ ] Delete role → Verify shifts still display (with fallback colors)
- [ ] Update role colors → Verify scheduler updates immediately

### E2E Tests
- [ ] Admin creates role → Assigns to staff → Creates shift → Verifies color in scheduler
- [ ] Admin assigns multiple roles → Creates shift → Selects role → Verifies color
- [ ] Admin changes role color → Verifies all shifts update

### Edge Cases
- [ ] Staff with 0 roles (shift creation still works)
- [ ] Staff with 0 locations (shift creation requires location)
- [ ] Deleted role (shifts show fallback colors)
- [ ] Invalid color codes (fallback to defaults)
- [ ] Very long role names (truncation/display)
- [ ] Many roles assigned to one staff (UI handles gracefully)

---

## 9. Future Enhancements (V2)

1. **Role Templates:** Pre-defined role templates with suggested colors
2. **Color Contrast Validation:** Warn admin if colors don't meet WCAG AA
3. **Role-Based Permissions:** Use roles for access control (beyond display)
4. **Role Statistics:** Show shift count per role in settings
5. **Bulk Role Assignment:** Assign role to multiple staff at once
6. **Role History:** Track when roles were assigned/removed
7. **Custom Role Icons:** Add icon/emoji to roles (beyond colors)
8. **Role-Based Availability:** Set availability rules per role

---

## 10. Known Limitations

1. **Color Contrast:** No automatic validation (admin must ensure readability)
2. **Role Deletion:** Soft delete only (cannot hard delete if used in shifts)
3. **Historical Shifts:** If role deleted, shifts show fallback colors (cannot update historical data)
4. **Performance:** Many roles (100+) may slow down role selector dropdowns (consider pagination/search)

---

## 11. Migration Script

```sql
-- Migration: Add job roles system
-- File: supabase/migrations/YYYYMMDDHHMMSS_add_job_roles_system.sql

-- 1. Create job_roles table
CREATE TABLE IF NOT EXISTS job_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    bg_color TEXT NOT NULL DEFAULT '#E5E7EB',
    text_color TEXT NOT NULL DEFAULT '#1F2937',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, LOWER(name))
);

CREATE INDEX IF NOT EXISTS idx_job_roles_tenant_id ON job_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_roles_is_active ON job_roles(tenant_id, is_active) WHERE is_active = true;

-- 2. Create staff_roles junction table
CREATE TABLE IF NOT EXISTS staff_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id),
    UNIQUE(tenant_id, staff_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_roles_staff_id ON staff_roles(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_roles_role_id ON staff_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_staff_roles_tenant_id ON staff_roles(tenant_id);

-- 3. Add role_id to shifts table
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES job_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shifts_role_id ON shifts(role_id);

-- 4. Enable RLS
ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (see Section 2 for full policies)
-- ... (add policies here)
```

---

## 12. Deliverables

1. **Database:**
   - `job_roles` table
   - `staff_roles` junction table
   - `shifts.role_id` column
   - RLS policies

2. **API Endpoints:**
   - Job roles CRUD endpoints
   - Staff role assignment endpoints
   - Updated shift endpoints

3. **UI Components:**
   - Settings > Job Roles tab
   - Staff detail > Job Roles section
   - Updated ShiftModal with role selection
   - Updated ShiftBlock with color display

4. **Documentation:**
   - This README
   - API documentation updates
   - User guide for role management

---

**End of Specification**

