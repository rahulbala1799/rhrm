# Staff Detail System Build Specification

**This spec is the single source of truth for migrations, API routes, and UI build.**

---

## 1. Scope and Non-Scope

### V1 Scope (Included)

**Staff Self-Service Profile**
- Staff members enter and maintain their own personal details (identity, contact, address, emergency contact)
- These values appear immediately in the admin view
- Staff can only edit their own record (linked via `user_id`)

**Admin/Manager HR Configuration**
- Admin/manager enters employment details (job title, department, manager, dates)
- Admin/manager enters pay configuration (pay type, rate/frequency, overtime rules)
- Admin/manager enters working rules (min/max hours, constraints, preferences)
- Staff cannot edit these admin fields

**Admin Staff Detail Page**
- Premium SaaS UI with tabbed interface
- View and edit all staff fields
- Status change tracking with history
- Deep-linkable tabs via query parameters

**Staff Self-Service Page**
- Simple, confidence-building form
- Edit only staff-entered fields
- Clear success/error feedback

**Data Structures**
- Extend existing `staff` table with new fields
- Create `staff_status_history` table for audit trail
- All fields stored in existing `staff` record (no separate tables for working rules or pay)

**API Endpoints**
- Admin endpoints: GET/PUT `/api/staff/[id]`
- Self-service endpoints: GET/PUT `/api/me/staff-profile`
- Supporting endpoints: locations list, staff list for manager dropdown

**Security**
- Tenant isolation enforced via RLS
- Role-based field restrictions enforced at API level
- Staff can only update whitelisted fields on their own record

### V2+ Non-Scope (Explicitly Excluded)

**Pay Rate History**
- Pay rate changes with effective dates
- Historical pay configurations
- Pay rate change audit trail

**Separate Working Rules Table**
- Working rules stored in `staff` table for v1
- Future: may create `staff_working_rules` table if complex rule management needed

**Notes/Comments System**
- Internal notes on staff records
- Activity log beyond status history

**Performance Reviews**
- Review tracking
- Goal setting
- Performance metrics

**Contract Management**
- Contract documents
- Contract terms tracking
- Contract renewal reminders

**Staff Photo/Avatar Upload**
- Profile picture upload
- Avatar management

**Bulk Operations**
- Bulk import/export
- Bulk status changes
- Bulk field updates

**Advanced Scheduling Features**
- Complex shift preferences
- Shift type differentials
- Weekend rate multipliers

**Integration Features**
- Payroll system integration
- External HRIS integration
- Third-party scheduling tools

---

## 2. Build Order

**CRITICAL: Do not start UI until migrations + API are done.**

### Step 1: Inspect Existing Schema and Conventions
1. Review existing `staff` table structure in `supabase/migrations/20240101000000_initial_schema.sql`
2. Review existing RLS policies in `supabase/migrations/20240101000004_rls_tenant_tables.sql`
3. Review existing API patterns in `apps/web/app/api/staff/route.ts` and `apps/web/app/api/staff/[id]/route.ts`
4. Review existing UI patterns in `apps/web/app/(dashboard)/staff/[id]/page.tsx`
5. Review existing TypeScript types in `apps/web/lib/supabase-types.ts`
6. Document existing enum values, naming conventions, and folder structure

### Step 2: Create Migrations
1. Create migration file following naming convention: `YYYYMMDDHHMMSS_staff_detail_system.sql`
2. Add new columns to `staff` table (staff-entered fields)
3. Add new columns to `staff` table (admin-entered fields)
4. Add constraints and check constraints
5. Create `staff_status_history` table
6. Add indexes as specified
9. Update RLS policies for new fields
10. Test migration on dev database
11. Document rollback procedure

### Step 3: Apply Migrations + Regenerate Types
1. Apply migration to dev database
2. Verify all columns exist with correct types
3. Verify constraints are enforced
4. Verify triggers work correctly
5. Regenerate TypeScript types using Supabase CLI
6. Update `apps/web/lib/supabase-types.ts` with new types
7. Verify TypeScript compilation passes

### Step 4: Implement API
1. Update `GET /api/staff/[id]` to return all new fields
2. Update `PUT /api/staff/[id]` to handle new fields and validation
3. Create `GET /api/me/staff-profile` endpoint
4. Create `PUT /api/me/staff-profile` endpoint with field restrictions
5. Add validation logic for all business rules
6. Add permission checks for role-based access
7. Add tenant isolation checks
8. Test all endpoints with various roles
9. Test error cases (403, 404, 409, 500)
10. Test validation failures

### Step 5: Implement UI
1. Update `/staff/[id]` page with tabbed interface
2. Create profile tab component (staff-entered fields)
3. Create employment tab component (admin fields)
4. Create pay tab component (admin fields)
5. Create hours-rules tab component (admin fields)
6. Connect existing availability tab
7. Connect existing documents tab
8. Create `/me/staff-profile` page
9. Add form validation
10. Add loading/error/empty states
11. Make responsive (mobile + desktop)
12. Add unsaved changes guard
13. Add status change modal
14. Test all UI interactions

### Step 6: QA Checklist
1. Run all acceptance tests from section 11
2. Test tenant isolation
3. Test role-based permissions
4. Test validation rules
5. Test UI responsiveness
6. Test error handling
7. Test edge cases
8. Verify build passes
9. Verify no TypeScript errors
10. Verify no lint errors

---

## 3. Naming and Convention Rules

**Table Naming**
- Follow existing snake_case convention (e.g., `staff`, `locations`, `tenant_compliance_requirements`)
- New table: `staff_status_history` (follows existing pattern)

**Column Naming**
- Follow existing snake_case convention (e.g., `first_name`, `date_of_birth`, `employment_type`)
- New columns: `preferred_name`, `address_line_1`, `job_title`, `pay_type`, etc.

**Enum Values**
- Follow existing snake_case convention (e.g., `full_time`, `on_leave`, `active`)
- New enums: `pay_type` values: `hourly`, `salary`
- New enums: `pay_frequency` values: `weekly`, `fortnightly`, `monthly`
- New enums: `overtime_rule_type` values: `multiplier`, `flat_extra`

**API Route Patterns**
- Follow existing pattern: `/api/staff/[id]` for admin endpoints
- Follow existing pattern: `/api/me/*` for self-service endpoints
- New routes: `/api/me/staff-profile` (GET/PUT)

**Folder Structure**
- Follow existing pattern: `apps/web/app/(dashboard)/staff/[id]/page.tsx` for admin pages
- Follow existing pattern: `apps/web/app/(dashboard)/me/*/page.tsx` for self-service pages
- New page: `apps/web/app/(dashboard)/me/staff-profile/page.tsx`

**Migration File Naming**
- Follow existing pattern: `YYYYMMDDHHMMSS_description.sql`
- Example: `20250101120000_staff_detail_system.sql`

**TypeScript Types**
- Regenerate from database using Supabase CLI
- Types live in `apps/web/lib/supabase-types.ts`
- Do not manually edit generated types

**Preference: Extend Existing Structures**
- Prefer adding columns to existing `staff` table over creating new tables
- Only create new tables when 1:1 relationship is insufficient (e.g., `staff_status_history` for audit trail)

---

## 4. Roles and Permissions Matrix

| Action | Staff | Manager | Admin | Superadmin |
|--------|-------|---------|-------|------------|
| View staff list | ✅ (own tenant only) | ✅ (own tenant only) | ✅ (own tenant only) | ✅ (own tenant only) |
| View staff detail | ✅ (own record only) | ✅ (own tenant only) | ✅ (own tenant only) | ✅ (own tenant only) |
| Edit staff-entered fields | ✅ (own record only) | ✅ (any in tenant) | ✅ (any in tenant) | ✅ (any in tenant) |
| Edit admin HR fields | ❌ | ✅ (any in tenant) | ✅ (any in tenant) | ✅ (any in tenant) |
| Change status | ❌ | ✅ (any in tenant) | ✅ (any in tenant) | ✅ (any in tenant) |
| Delete staff | ❌ | ❌ | ✅ (own tenant only) | ✅ (own tenant only) |
| View sensitive fields (NI number) | ❌ | ✅ (any in tenant) | ✅ (any in tenant) | ✅ (any in tenant) |

**Notes:**
- "Own record" means staff record where `user_id` matches authenticated user's ID
- "Own tenant" means records where `tenant_id` matches user's current tenant context
- **Staff detail viewing:** Staff can view their own record only via `/api/me/staff-profile`; `/api/staff/[id]` is admin-only and returns 403 Forbidden for staff role
- Manager cannot delete staff (only admin and superadmin)
- Sensitive fields (e.g., `national_insurance_number`) are admin-only, not visible to staff

---

## 5. Data Ownership Model

### A) Staff Self-Service Editable Fields

**Who can view:**
- Staff member (their own record only)
- Admin, manager, superadmin (any record in tenant)

**Who can edit:**
- Staff member (their own record only, via `/api/me/staff-profile`)
- Admin, manager, superadmin (any record in tenant, via `/api/staff/[id]`)

**Where stored:**
- Existing `staff` table, new columns:
  - `preferred_name` (text, nullable)
  - `email` (text, nullable) - existing field, now staff-editable
  - `phone` (text, nullable) - existing field, now staff-editable
  - `date_of_birth` (date, nullable) - existing field, now staff-editable
  - `address_line_1` (text, nullable)
  - `address_line_2` (text, nullable)
  - `city` (text, nullable)
  - `postcode` (text, nullable)
  - `country` (text, nullable)
  - `emergency_contact_name` (text, nullable)
  - `emergency_contact_relationship` (text, nullable)
  - `emergency_contact_phone` (text, nullable)

**Field Whitelist for Staff Updates:**
When staff calls `PUT /api/me/staff-profile`, only these fields are accepted:
- `preferred_name`
- `email`
- `phone`
- `date_of_birth`
- `address_line_1`
- `address_line_2`
- `city`
- `postcode`
- `country`
- `emergency_contact_name`
- `emergency_contact_relationship`
- `emergency_contact_phone`

All other fields must be rejected with 403 Forbidden.

### B) Admin HR Editable Fields

**Who can view:**
- Admin, manager, superadmin (any record in tenant)
- Staff member (their own record only, read-only for transparency)

**Who can edit:**
- Admin, manager, superadmin only (any record in tenant)
- Staff cannot edit these fields

**Where stored:**
- Existing `staff` table, new columns:
  - `job_title` (text, nullable)
  - `department` (text, nullable)
  - `manager_id` (uuid, nullable, references `staff.id`)
  - `pay_type` (text, enum: `hourly`, `salary`, nullable)
  - `salary_amount` (decimal 10,2, nullable)
  - `pay_frequency` (text, enum: `weekly`, `fortnightly`, `monthly`, nullable)
  - `overtime_enabled` (boolean, default false)
  - `overtime_rule_type` (text, enum: `multiplier`, `flat_extra`, nullable)
  - `overtime_multiplier` (decimal 4,2, nullable)
  - `overtime_flat_extra` (decimal 10,2, nullable)
  - `contracted_weekly_hours` (decimal 5,2, nullable)
  - `min_hours_per_week` (decimal 5,2, nullable)
  - `max_hours_per_week` (decimal 5,2, nullable)
  - `max_hours_per_day` (decimal 5,2, nullable)
  - `max_consecutive_days` (integer, nullable)
  - `min_rest_hours_between_shifts` (decimal 4,2, nullable)
  - `preferred_working_days` (integer array, nullable)
  - `preferred_shift_types` (text array, nullable)

**Existing fields (admin-only):**
- `employment_type` (text, enum, nullable)
- `location_id` (uuid, nullable)
- `employment_start_date` (date, nullable)
- `employment_end_date` (date, nullable)
- `hourly_rate` (decimal 10,2, nullable)
- `status` (text, enum, not null, default 'active')

### C) Sensitive Fields (Admin-Only)

**Who can view:**
- Admin, manager, superadmin only (any record in tenant)
- Staff cannot view these fields

**Who can edit:**
- Admin, manager, superadmin only (any record in tenant)
- Staff cannot edit these fields

**Where stored:**
- Existing `staff` table:
  - `national_insurance_number` (text, nullable) - existing field, remains admin-only
  - `employee_number` (text, not null) - existing field, remains admin-only
  - `tenant_id` (uuid, not null) - system field, never editable
  - `user_id` (uuid, nullable) - system field, never editable
  - `id` (uuid, primary key) - system field, never editable
  - `created_at` (timestamptz) - system field, never editable
  - `updated_at` (timestamptz) - system field, auto-updated

---

## 6. Data Model Requirements (Migrations)

### Extend Existing Staff Record

**Migration file:** Create new migration following naming convention `YYYYMMDDHHMMSS_staff_detail_system.sql`

**Add new columns to existing `staff` table:**

**Identity/Contact (Staff-Entered)**
- `preferred_name` - text, nullable, no default
- Note: `email`, `phone`, `date_of_birth` already exist and remain nullable

**Address (Staff-Entered)**
- `address_line_1` - text, nullable, no default
- `address_line_2` - text, nullable, no default
- `city` - text, nullable, no default
- `postcode` - text, nullable, no default
- `country` - text, nullable, no default

**Emergency Contact (Staff-Entered)**
- `emergency_contact_name` - text, nullable, no default
- `emergency_contact_relationship` - text, nullable, no default
- `emergency_contact_phone` - text, nullable, no default

**Employment (Admin-Entered)**
- `job_title` - text, nullable, no default
- `department` - text, nullable, no default
- `manager_id` - uuid, nullable, references `staff.id` with ON DELETE SET NULL
- Note: `employment_type`, `location_id`, `employment_start_date`, `employment_end_date`, `status` already exist

**Pay (Admin-Entered)**
- `pay_type` - text, nullable, check constraint: must be `hourly` or `salary` if not null
- `salary_amount` - decimal with precision 10, scale 2, nullable, no default
- `pay_frequency` - text, nullable, check constraint: must be `weekly`, `fortnightly`, or `monthly` if not null
- `overtime_enabled` - boolean, not null, default false
- `overtime_rule_type` - text, nullable, check constraint: must be `multiplier` or `flat_extra` if not null
- `overtime_multiplier` - decimal with precision 4, scale 2, nullable, no default
- `overtime_flat_extra` - decimal with precision 10, scale 2, nullable, no default
- Note: `hourly_rate` already exists and remains nullable

**Working Rules (Admin-Entered)**
- `contracted_weekly_hours` - decimal with precision 5, scale 2, nullable, no default
- `min_hours_per_week` - decimal with precision 5, scale 2, nullable, no default
- `max_hours_per_week` - decimal with precision 5, scale 2, nullable, no default
- `max_hours_per_day` - decimal with precision 5, scale 2, nullable, no default
- `max_consecutive_days` - integer, nullable, no default
- `min_rest_hours_between_shifts` - decimal with precision 4, scale 2, nullable, no default
- `preferred_working_days` - integer array, nullable, no default
- `preferred_shift_types` - text array, nullable, no default

### Required Constraints (Plain English)

**Unique Constraints**
- `employee_number` must be unique per tenant (already exists via `UNIQUE(tenant_id, employee_number)`)

**Check Constraints**
- `pay_type` must be one of: `hourly`, `salary`, or null
- `pay_frequency` must be one of: `weekly`, `fortnightly`, `monthly`, or null
- `overtime_rule_type` must be one of: `multiplier`, `flat_extra`, or null
- `status` must be one of: `active`, `on_leave`, `terminated` (already exists)
- `employment_type` must be one of: `full_time`, `part_time`, `casual`, `contractor`, or null (already exists)

**Foreign Key Constraints**
- `manager_id` must reference a valid `staff.id` in the same tenant (enforce via application logic, not FK constraint to allow cross-tenant prevention)
- `location_id` must reference a valid `locations.id` in the same tenant (already exists)
- `user_id` must reference a valid `profiles.id` (already exists)

**Application-Level Validation Rules (Not Database Constraints)**
- If `pay_type = 'hourly'`, then `hourly_rate` must be provided and >= 0
- If `pay_type = 'salary'`, then `salary_amount` must be provided and >= 0
- If `pay_type` is set, then `pay_frequency` must be set
- If `overtime_enabled = true`, then `overtime_rule_type` must be set
- If `overtime_rule_type = 'multiplier'`, then `overtime_multiplier` must be provided and > 0
- If `overtime_rule_type = 'flat_extra'`, then `overtime_flat_extra` must be provided and >= 0
- `min_hours_per_week` cannot exceed `max_hours_per_week` (if both provided)
- `manager_id` cannot reference the same staff record (prevent self-reference)
- `manager_id` must reference a staff member in the same tenant (enforce via application logic)
- `preferred_working_days` array must contain only integers 0-6 (Sunday=0, Saturday=6)
- `preferred_shift_types` array must contain only: `morning`, `evening`, `night`

### Required Indexes (Plain English)

**Existing Indexes (Keep)**
- Index on `tenant_id` for tenant isolation queries
- Unique index on `(tenant_id, employee_number)` for employee number uniqueness

**New Indexes (Add)**
- Index on `manager_id` for manager lookup queries (if manager_id is not null)
- Index on `user_id` for staff self-service lookups (if user_id is not null)
- Index on `status` for status filtering queries

### Status History Table (V1 Required)

**Table name:** `staff_status_history`

**Purpose:** Audit trail of status changes for compliance and accountability

**Columns:**
- `id` - uuid, primary key, auto-generated
- `tenant_id` - uuid, not null, references `tenants.id` with ON DELETE CASCADE
- `staff_id` - uuid, not null, references `staff.id` with ON DELETE CASCADE
- `old_status` - text, nullable, check constraint: must be `active`, `on_leave`, `terminated`, or null
- `new_status` - text, not null, check constraint: must be `active`, `on_leave`, or `terminated`
- `effective_date` - date, not null, default current date
- `reason` - text, nullable, no default (optional reason for status change)
- `changed_by` - uuid, not null, references `profiles.id` (who made the change)
- `created_at` - timestamptz, not null, default now()

**Indexes:**
- Index on `(tenant_id, staff_id)` for staff history queries
- Index on `staff_id` for staff lookup
- Index on `effective_date` for date range queries

**Status History Creation:**
- Status history entries are created by the API (not via database trigger)
- **Implementation:** When `PUT /api/staff/[id]` updates `status`, the API must:
  1. Read old status from database before update
  2. Update `staff.status` field
  3. Manually insert into `staff_status_history` with:
     - `old_status`: value before update
     - `new_status`: new status value
     - `effective_date`: from `status_change_effective_date` in request body, or default to current date if not provided
     - `reason`: from `status_change_reason` in request body, or null if not provided
     - `changed_by`: from `auth.uid()` (authenticated user making the API call)
     - `tenant_id`: from tenant context
     - `staff_id`: staff record ID
- **Why API instead of trigger:** Triggers cannot read request body parameters (`status_change_effective_date`, `status_change_reason`), so API must handle this to support modal-provided values
- **Note:** All API updates happen under authenticated user sessions (not service role), so `auth.uid()` will always be available and correct

**RLS:**
- Enable RLS on `staff_status_history` table
- Policy: Users can only view status history for staff in their tenant
- Policy: Only admin/manager/superadmin can view status history

---

## 7. RLS and Security Requirements

### Tenant Isolation (Always Enforced)

**RLS Behavior:**
- All queries on `staff` table must filter by `tenant_id` from tenant context
- Staff can only see staff records where `tenant_id` matches their current tenant
- Admin/manager can only see staff records where `tenant_id` matches their current tenant
- Superadmin can only see staff records where `tenant_id` matches their current tenant (no cross-tenant access)

**Implementation:**
- Use `getTenantContext()` in all API routes to get `tenantId`
- All database queries must include `.eq('tenant_id', tenantId)`
- RLS policies on `staff` table must enforce tenant isolation
- RLS policies on `staff_status_history` table must enforce tenant isolation

### Staff Self-Service Update Restrictions

**RLS Behavior:**
- Staff can only update their own staff record (where `user_id` matches authenticated user's ID)
- Staff can only update whitelisted fields (see Field Whitelist below)
- Staff cannot update any admin-only fields
- Staff cannot update system fields (`id`, `tenant_id`, `user_id`, `employee_number`, `created_at`, `updated_at`)

**Field Whitelist for Staff Updates:**
When staff calls `PUT /api/me/staff-profile`, only these fields are accepted:
- `preferred_name`
- `email`
- `phone`
- `date_of_birth`
- `address_line_1`
- `address_line_2`
- `city`
- `postcode`
- `country`
- `emergency_contact_name`
- `emergency_contact_relationship`
- `emergency_contact_phone`

**API Enforcement:**
- Server must reject any fields not in the whitelist
- Return 403 Forbidden with error message: "Staff can only update their own profile fields"
- Reject even if forbidden fields are sent in request body
- Validate that `user_id` matches authenticated user before allowing update

**RLS Enforcement:**
- RLS policy on `staff` table: Staff can only UPDATE rows where `user_id = auth.uid()`
- RLS policy on `staff` table: Staff can only SELECT rows where `user_id = auth.uid()` AND `tenant_id` matches their tenant
- **Critical:** Staff cannot SELECT any other staff records, even in their tenant. This prevents staff from accessing `national_insurance_number` or other sensitive data via direct database queries

### Admin/Manager Update Permissions

**RLS Behavior:**
- Admin/manager can update any staff record in their tenant
- Admin/manager can update all fields except system identifiers
- Admin/manager cannot update: `id`, `tenant_id`, `created_at` (system fields)
- Admin/manager can update `user_id` (for linking accounts) but this should be rare

**API Enforcement:**
- Verify role via `getTenantContext()` - must be `admin`, `manager`, or `superadmin`
- Verify `tenant_id` matches - staff record must be in same tenant as admin/manager
- Return 403 Forbidden if role is insufficient
- Return 404 Not Found if staff record not found or in different tenant

**RLS Enforcement:**
- RLS policy on `staff` table: Admin/manager can UPDATE rows where `tenant_id` matches their tenant
- RLS policy on `staff` table: Admin/manager can SELECT rows where `tenant_id` matches their tenant

### Delete Permissions

**RLS Behavior:**
- Only admin and superadmin can delete staff records
- Manager cannot delete staff records
- Staff cannot delete any records

**API Enforcement:**
- Verify role via `getTenantContext()` - must be `admin` or `superadmin`
- Verify `tenant_id` matches - staff record must be in same tenant
- Return 403 Forbidden if role is `manager` or `staff`
- Return 404 Not Found if staff record not found or in different tenant

**RLS Enforcement:**
- RLS policy on `staff` table: Only admin/superadmin can DELETE rows where `tenant_id` matches their tenant

### Sensitive Fields Access

**Approach:** Staff can only SELECT their own staff row, and `national_insurance_number` is never returned in any staff-accessible endpoint.

**RLS Behavior:**
- Staff can only SELECT rows where `user_id = auth.uid()` AND `tenant_id` matches their tenant
- This means staff can only query their own record, never other staff records
- Admin/manager/superadmin can SELECT any staff record in their tenant (via role-based RLS policy)
- `national_insurance_number` remains in `staff` table but staff cannot access it via RLS restriction

**API Enforcement:**
- When staff calls `GET /api/me/staff-profile`, exclude `national_insurance_number` from response (defense in depth)
- When admin calls `GET /api/staff/[id]`, include `national_insurance_number` in response
- When staff calls `PUT /api/me/staff-profile`, reject `national_insurance_number` if sent
- Staff cannot call `GET /api/staff/[id]` at all (see API Contracts section)

**RLS Enforcement:**
- RLS policy on `staff` table: Staff can only SELECT rows where `user_id = auth.uid()` (own record only)
- RLS policy on `staff` table: Admin/manager/superadmin can SELECT rows where `tenant_id` matches their tenant
- **Critical:** Staff RLS policy prevents staff from querying any staff record except their own, which prevents access to `national_insurance_number` and other sensitive fields via direct database queries
- Application-level filtering provides defense in depth but RLS is the primary protection

### Forbidden Fields Must Be Blocked by BOTH RLS and API Validation

**Dual Enforcement:**
- RLS policies provide database-level protection
- API validation provides application-level protection
- Both must be implemented - do not rely on only one layer
- If RLS fails, API should still reject
- If API validation fails, RLS should still prevent access

---

## 8. API Contracts

### GET /api/staff/[id]

**Purpose:** Fetch full staff detail by ID for admin/manager view

**Permissions:** Admin, manager, superadmin only. Staff are FORBIDDEN from this endpoint.

**Staff Access Rule:** Staff must use `GET /api/me/staff-profile` to view their own record. This prevents ID enumeration and simplifies security model.

**Query Parameters:** None

**Request Body:** None

**Response Shape:**
```
{
  staff: {
    // System fields
    id: string (uuid)
    tenant_id: string (uuid)
    user_id: string (uuid) | null
    employee_number: string
    created_at: string (iso datetime)
    updated_at: string (iso datetime)
    
    // Identity
    first_name: string
    last_name: string
    preferred_name: string | null
    email: string | null
    phone: string | null
    date_of_birth: string (YYYY-MM-DD) | null
    
    // Address
    address_line_1: string | null
    address_line_2: string | null
    city: string | null
    postcode: string | null
    country: string | null
    
    // Emergency contact
    emergency_contact_name: string | null
    emergency_contact_relationship: string | null
    emergency_contact_phone: string | null
    
    // Employment (admin)
    employment_type: 'full_time' | 'part_time' | 'casual' | 'contractor' | null
    job_title: string | null
    department: string | null
    location_id: string (uuid) | null
    employment_start_date: string (YYYY-MM-DD) | null
    employment_end_date: string (YYYY-MM-DD) | null
    manager_id: string (uuid) | null
    status: 'active' | 'on_leave' | 'terminated'
    
    // Pay (admin)
    pay_type: 'hourly' | 'salary' | null
    hourly_rate: number | null
    salary_amount: number | null
    pay_frequency: 'weekly' | 'fortnightly' | 'monthly' | null
    overtime_enabled: boolean
    overtime_rule_type: 'multiplier' | 'flat_extra' | null
    overtime_multiplier: number | null
    overtime_flat_extra: number | null
    
    // Working rules (admin)
    contracted_weekly_hours: number | null
    min_hours_per_week: number | null
    max_hours_per_week: number | null
    max_hours_per_day: number | null
    max_consecutive_days: number | null
    min_rest_hours_between_shifts: number | null
    preferred_working_days: number[] | null (array of 0-6)
    preferred_shift_types: string[] | null (array of 'morning' | 'evening' | 'night')
    
    // Sensitive (admin only)
    national_insurance_number: string | null (only if admin/manager)
    
    // Relations
    location: {
      id: string (uuid)
      name: string
    } | null
    manager: {
      id: string (uuid)
      first_name: string
      last_name: string
      employee_number: string
    } | null
  }
}
```

**Validation Rules:**
- `id` must be valid UUID format
- Staff record must exist
- Staff record must be in same tenant as requester
- **Role check:** Must be admin, manager, or superadmin. Staff role returns 403 Forbidden.

**Error Codes:**
- `401 Unauthorized` - User not authenticated or no tenant context
- `403 Forbidden` - Staff role trying to access this endpoint (staff must use `/api/me/staff-profile`)
- `404 Not Found` - Staff record not found or in different tenant
- `500 Internal Server Error` - Database or server error

### PUT /api/staff/[id]

**Purpose:** Update staff detail by ID (admin/manager only, or staff updating their own record with restrictions)

**Permissions:** 
- Staff can only update staff-entered fields on their own record
- Admin/manager can update all fields

**Query Parameters:** None

**Request Body Shape:**
```
{
  // Staff-entered fields (allowed for staff self-service)
  preferred_name?: string | null
  email?: string | null
  phone?: string | null
  date_of_birth?: string (YYYY-MM-DD) | null
  address_line_1?: string | null
  address_line_2?: string | null
  city?: string | null
  postcode?: string | null
  country?: string | null
  emergency_contact_name?: string | null
  emergency_contact_relationship?: string | null
  emergency_contact_phone?: string | null
  
  // Admin-only fields (rejected if sent by staff)
  employment_type?: 'full_time' | 'part_time' | 'casual' | 'contractor' | null
  job_title?: string | null
  department?: string | null
  location_id?: string (uuid) | null
  employment_start_date?: string (YYYY-MM-DD) | null
  employment_end_date?: string (YYYY-MM-DD) | null
  manager_id?: string (uuid) | null
  status?: 'active' | 'on_leave' | 'terminated'
  status_change_effective_date?: string (YYYY-MM-DD) | null (optional, used when status changes)
  status_change_reason?: string | null (optional, used when status changes)
  pay_type?: 'hourly' | 'salary' | null
  hourly_rate?: number | null
  salary_amount?: number | null
  pay_frequency?: 'weekly' | 'fortnightly' | 'monthly' | null
  overtime_enabled?: boolean
  overtime_rule_type?: 'multiplier' | 'flat_extra' | null
  overtime_multiplier?: number | null
  overtime_flat_extra?: number | null
  contracted_weekly_hours?: number | null
  min_hours_per_week?: number | null
  max_hours_per_week?: number | null
  max_hours_per_day?: number | null
  max_consecutive_days?: number | null
  min_rest_hours_between_shifts?: number | null
  preferred_working_days?: number[] | null
  preferred_shift_types?: string[] | null
}
```

**Response Shape:** Same as GET /api/staff/[id]

**Validation Rules:**
- `id` must be valid UUID format
- Staff record must exist
- Staff record must be in same tenant as requester
- **Role check:** Must be admin, manager, or superadmin. Staff role returns 403 Forbidden (staff must use `/api/me/staff-profile`).
- Validate all business rules (see Validation Rules section)
- **Status Change Handling:**
  - If `status` changes, API must create entry in `staff_status_history` table
  - API reads old status from database before updating
  - API inserts into `staff_status_history` with:
    - `old_status`: value from database before update
    - `new_status`: new status value from request
    - `effective_date`: from `status_change_effective_date` in request body, or current date if not provided
    - `reason`: from `status_change_reason` in request body, or null if not provided
    - `changed_by`: authenticated user's ID (from `auth.uid()`)
  - **Note:** UI should use status change modal (see UI Specification) which provides effective_date and reason. API also supports direct status updates for programmatic/bulk operations (without modal), using defaults if effective_date/reason not provided.

**Error Codes:**
- `400 Bad Request` - Invalid request body, validation failure
- `401 Unauthorized` - User not authenticated or no tenant context
- `403 Forbidden` - Staff role trying to access this endpoint (staff must use `/api/me/staff-profile`)
- `404 Not Found` - Staff record not found or in different tenant
- `409 Conflict` - Business rule violation (e.g., manager self-reference, min > max hours)
- `500 Internal Server Error` - Database or server error

### GET /api/me/staff-profile

**Purpose:** Fetch "my staff profile" (staff member's own record)

**Permissions:** Authenticated user with staff record linked to their `user_id`

**Query Parameters:** None

**Request Body:** None

**Response Shape:**
```
{
  staff: {
    // Same structure as GET /api/staff/[id], but:
    // - Excludes national_insurance_number (sensitive)
    // - Only returns staff's own record
    // - Includes all fields (staff-entered and admin-entered, but admin fields are read-only)
  }
}
```

**Validation Rules:**
- User must be authenticated
- User must have tenant context
- Staff record must exist with `user_id` matching authenticated user
- Staff record must be in same tenant as user

**Error Codes:**
- `401 Unauthorized` - User not authenticated or no tenant context
- `404 Not Found` - Staff record not found for this user
- `500 Internal Server Error` - Database or server error

### PUT /api/me/staff-profile

**Purpose:** Update "my staff profile" (only staff-entered fields allowed)

**Permissions:** Authenticated user with staff record linked to their `user_id`

**Query Parameters:** None

**Request Body Shape:**
```
{
  preferred_name?: string | null
  email?: string | null
  phone?: string | null
  date_of_birth?: string (YYYY-MM-DD) | null
  address_line_1?: string | null
  address_line_2?: string | null
  city?: string | null
  postcode?: string | null
  country?: string | null
  emergency_contact_name?: string | null
  emergency_contact_relationship?: string | null
  emergency_contact_phone?: string | null
}
```

**Response Shape:** Same as GET /api/me/staff-profile

**Validation Rules:**
- User must be authenticated
- User must have tenant context
- Staff record must exist with `user_id` matching authenticated user
- Staff record must be in same tenant as user
- Reject any fields not in whitelist with 403
- Validate date of birth (must be in past)
- Validate email format (if provided)
- Validate phone format (basic, if provided)

**Error Codes:**
- `400 Bad Request` - Invalid request body, validation failure
- `401 Unauthorized` - User not authenticated or no tenant context
- `403 Forbidden` - Forbidden fields detected in request body
- `404 Not Found` - Staff record not found for this user
- `500 Internal Server Error` - Database or server error

### GET /api/settings/locations

**Purpose:** Get all locations for tenant (used for location dropdown)

**Permissions:** Any authenticated user with tenant context

**Query Parameters:** None

**Request Body:** None

**Response Shape:**
```
{
  locations: Array<{
    id: string (uuid)
    name: string
    address: string | null
    postcode: string | null
    phone: string | null
  }>
}
```

**Validation Rules:** None (existing endpoint)

**Error Codes:**
- `401 Unauthorized` - User not authenticated or no tenant context
- `500 Internal Server Error` - Database or server error

**Backward Compatibility:** This endpoint already exists and should remain unchanged.

### GET /api/auth/role

**Purpose:** Get current user's role in tenant (used for UI gating)

**Permissions:** Any authenticated user with tenant context

**Query Parameters:** None

**Request Body:** None

**Response Shape:**
```
{
  role: 'staff' | 'manager' | 'admin' | 'superadmin'
  userId: string (uuid)
}
```

**Validation Rules:** None (existing endpoint)

**Error Codes:**
- `401 Unauthorized` - User not authenticated or no tenant context
- `500 Internal Server Error` - Database or server error

**Backward Compatibility:** This endpoint already exists and should remain unchanged.

### GET /api/staff (Extended for Manager Dropdown)

**Purpose:** Get staff list for tenant (extend existing endpoint for manager dropdown)

**Permissions:** Any authenticated user with tenant context

**Query Parameters:**
- `search` (optional): Search term for name, email, or employee number
- `status` (optional): Filter by status (`active`, `on_leave`, `terminated`)
- `location_id` (optional): Filter by location UUID
- `page` (optional): Page number for pagination
- `pageSize` (optional): Items per page
- `for_manager_dropdown` (optional): If true, returns minimal fields for manager selection

**Request Body:** None

**Response Shape (Default):**
```
{
  staff: Array<{
    // Full staff record (existing response)
  }>,
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
```

**Response Shape (for_manager_dropdown=true):**
```
{
  staff: Array<{
    id: string (uuid)
    employee_number: string
    first_name: string
    last_name: string
    job_title: string | null
    preferred_name: string | null
  }>
}
```

**Validation Rules:**
- If `for_manager_dropdown=true`, exclude current staff member from results (prevent self-reference)
- All existing validation rules apply (search, status, location_id, pagination)

**Error Codes:**
- `401 Unauthorized` - User not authenticated or no tenant context
- `400 Bad Request` - Invalid query parameters
- `500 Internal Server Error` - Database or server error

**Backward Compatibility:** Existing behavior unchanged when `for_manager_dropdown` is not provided.

---

## 9. UI Specification

### Admin Staff Detail UI (`/staff/[id]`)

**Page Header Content:**
- Back button/link to `/staff` (staff list)
- Display name: `preferred_name || first_name + ' ' + last_name`
- Employee number (monospace font, subtle styling)
- Status badge (color-coded: green=active, yellow=on_leave, red=terminated)
- Quick info chips: location name, employment type, job title (if available)
- Actions (right side):
  - Edit button (only if admin/manager/superadmin) - toggles edit mode
  - Save button (only in edit mode, only if admin/manager/superadmin)
  - Cancel button (only in edit mode, only if admin/manager/superadmin)
  - Change status button (only if admin/manager/superadmin) - opens modal
  - Delete button (only if admin/superadmin) - opens confirmation dialog

**Tab List (Deep-Linkable by Query Param):**
- Tabs rendered as horizontal tab bar below header
- Active tab highlighted
- Tab names:
  1. Profile (`?tab=profile`) - default if no tab specified
  2. Employment (`?tab=employment`)
  3. Pay (`?tab=pay`)
  4. Hours & Rules (`?tab=hours-rules`)
  5. Availability (`?tab=availability`)
  6. Documents (`?tab=documents`)
- URL updates when tab clicked (deep-linkable)
- Invalid `tab` param defaults to `profile`
- Tab state persists when switching between view/edit mode

**Tab: Profile (`?tab=profile`)**

**View Mode:**
- Section: "Entered by Staff" (collapsible section)
  - Preferred name
  - Email
  - Phone
  - Date of birth
  - Address (formatted as multi-line)
  - Emergency contact (name, relationship, phone)
- Section: "HR Information" (collapsible section)
  - First name, last name (read-only, from system)
  - Employee number (read-only)
  - National insurance number (only if admin/manager, read-only)
- Edit button at top (if admin/manager) switches to edit mode

**Edit Mode (Admin/Manager Only):**
- Same sections as view mode
- All staff-entered fields are editable
- HR information section shows read-only system fields
- Save button at bottom (validates and submits)
- Cancel button at bottom (discards changes, returns to view mode)
- Unsaved changes warning if navigating away

**Tab: Employment (`?tab=employment`)**

**View Mode:**
- Location (shows location name or "—")
- Employment type (formatted: "Full-time", "Part-time", etc.)
- Job title (or "—")
- Department (or "—")
- Start date (formatted date or "—")
- End date (formatted date or "—", or "N/A" if not set)
- Manager (shows manager name + employee number, or "—", or "None")
- Status (badge, same as header)

**Edit Mode (Admin/Manager Only):**
- Location dropdown (populated from `/api/settings/locations`)
- Employment type dropdown (Full-time, Part-time, Casual, Contractor, None)
- Job title text input
- Department text input
- Start date date picker
- End date date picker
- Manager dropdown (populated from `/api/staff?for_manager_dropdown=true`, excludes current staff member)
- Status dropdown (Active, On Leave, Terminated) - triggers status change modal if changed
- Save/Cancel buttons
- Validation: End date must be after start date (if both provided)

**Tab: Pay (`?tab=pay`)**

**View Mode:**
- Pay summary card (highlighted box):
  - Pay type (Hourly or Salary)
  - If hourly: "£X.XX per hour"
  - If salary: "£X,XXX.XX per [frequency]"
  - Pay frequency (Weekly, Fortnightly, Monthly)
  - Overtime: "Enabled" or "Not enabled"
  - If overtime enabled: Shows rule (e.g., "1.5x multiplier" or "+£2.00 per hour")

**Edit Mode (Admin/Manager Only):**
- Pay type radio buttons (Hourly, Salary, None)
- If hourly selected:
  - Hourly rate input (decimal, currency format)
  - Pay frequency dropdown (required)
- If salary selected:
  - Salary amount input (decimal, currency format)
  - Pay frequency dropdown (required)
- Overtime enabled checkbox
- If overtime enabled:
  - Overtime rule type radio buttons (Multiplier, Flat extra)
  - If multiplier: Multiplier input (decimal, e.g., 1.5)
  - If flat extra: Flat extra input (decimal, currency format)
- Save/Cancel buttons
- Validation: Pay type rules enforced (see Validation Rules)

**Tab: Hours & Rules (`?tab=hours-rules`)**

**View Mode:**
- Contracted weekly hours (or "—")
- Min/Max hours per week (formatted as "X - Y hours per week" or "—")
- Max hours per day (or "—")
- Max consecutive days (or "—")
- Min rest hours between shifts (or "—")
- Preferred working days (formatted as "Mon, Wed, Fri" or "—")
- Preferred shift types (formatted as "Morning, Evening" or "—")

**Edit Mode (Admin/Manager Only):**
- Contracted weekly hours input (decimal)
- Min hours per week input (decimal)
- Max hours per week input (decimal)
- Max hours per day input (decimal, optional)
- Max consecutive days input (integer, optional)
- Min rest hours between shifts input (decimal, optional)
- Preferred working days checkboxes (Sun, Mon, Tue, Wed, Thu, Fri, Sat)
- Preferred shift types checkboxes (Morning, Evening, Night)
- Save/Cancel buttons
- Validation: Min cannot exceed max (inline validation, red border if invalid)

**Tab: Availability (`?tab=availability`)**

**View/Edit Mode:**
- Connect to existing availability UI
- Uses existing `/api/staff/[id]/availability` endpoint
- No changes needed to this tab (existing functionality)

**Tab: Documents (`?tab=documents`)**

**View/Edit Mode:**
- Connect to existing documents UI
- Uses existing `/api/staff/[id]/documents` endpoint
- No changes needed to this tab (existing functionality)

**Edit Mode Behavior:**
- Toggle between view and edit mode via Edit button
- Edit mode shows form inputs instead of read-only text
- Save button validates all fields before submitting
- Cancel button discards changes and returns to view mode
- Unsaved changes warning if user tries to navigate away or switch tabs
- Loading state during save (disable form, show spinner)
- Success message after save (toast or inline)
- Error message if save fails (toast or inline)

**Save/Cancel Behavior:**
- Save button: Validates form, shows loading state, submits to `PUT /api/staff/[id]`, shows success/error, returns to view mode
- Cancel button: Discards local form state, returns to view mode, no API call
- Unsaved changes guard: Warns user if they try to navigate away with unsaved changes (browser back, tab switch, etc.)

**Status Change Modal Behavior:**
- Triggered when status dropdown changes in Employment tab (edit mode)
- Modal shows:
  - Current status (read-only)
  - New status dropdown (Active, On Leave, Terminated)
  - Effective date picker (defaults to today)
  - Reason textarea (optional)
- Modal actions:
  - Cancel button (closes modal, reverts status dropdown to original value)
  - Confirm button (saves status change via PUT /api/staff/[id] with status, status_change_effective_date, and status_change_reason, creates status history entry, closes modal)
- After confirmation: Status updates via API, API creates status history entry with provided effective_date and reason, page refreshes to show new status
- **Note:** This is the preferred UI method for status changes. The API also supports direct status updates (without modal) for programmatic/bulk operations, but UI should always use the modal to capture effective_date and reason.

**Loading/Empty/Error States:**
- Loading: Skeleton loader or spinner while fetching staff data
- Empty: Should not occur (staff record must exist to view page), but if staff not found, show 404 page
- Error: Error message with retry button if fetch fails

**Responsive Behavior:**
- Desktop (>768px): Full tab interface, side-by-side layout where appropriate
- Mobile (<768px): 
  - Tabs become horizontal scrollable list
  - Form fields stack vertically
  - Save/Cancel buttons full width
  - Header actions stack vertically
  - Status badge moves below name on mobile

### Staff Self-Service UI (`/me/staff-profile`)

**Page Header Content:**
- Title: "My Staff Profile"
- Description: "Update your personal information"
- No actions (simple page)

**Sections:**

**Section 1: Identity & Contact**
- Preferred name (text input)
- Email (text input, email type)
- Phone (text input, tel type)
- Date of birth (date picker)

**Section 2: Address**
- Address line 1 (text input)
- Address line 2 (text input, optional)
- City (text input)
- Postcode (text input)
- Country (text input)

**Section 3: Emergency Contact**
- Emergency contact name (text input)
- Emergency contact relationship (text input, e.g., "Spouse", "Parent")
- Emergency contact phone (text input, tel type)

**Fields:**
- All fields are editable (no read-only fields)
- All fields are optional (no required fields)
- Clear labels above each input
- Helpful placeholder text where appropriate

**Save UX:**
- Single "Save Changes" button at bottom of page
- Button disabled during save (loading state)
- Success message after save (toast notification: "Profile updated successfully")
- Error message if save fails (toast notification with error details)
- Form validation on blur (show errors inline)
- Form validation on submit (show all errors if invalid)

**Admin-Only Fields Visibility:**
- Option 1 (Recommended): Do not show admin fields at all (cleaner, less confusing)
- Option 2 (Alternative): Show admin fields as read-only summary section at bottom:
  - Employment type (read-only)
  - Job title (read-only)
  - Department (read-only)
  - Location (read-only)
  - Pay summary (read-only, e.g., "£15.00 per hour, weekly")
  - Working hours summary (read-only, e.g., "20-40 hours per week")

**Loading/Error States:**
- Loading: Skeleton loader or spinner while fetching profile
- Error: Error message with retry button if fetch fails
- Empty: Should not occur (staff record should exist), but show helpful message if not found

**Mobile-First Expectations:**
- Form fields stack vertically
- Save button full width
- Adequate spacing between sections
- Touch-friendly input sizes (minimum 44px height)
- Keyboard-appropriate input types (email, tel, date)

---

## 10. Validation Rules

### Date Validation

**Date of Birth:**
- Must be in the past (cannot be today or future)
- Format: YYYY-MM-DD
- Empty string treated as null (allowed)
- Null is allowed (optional field)

**Employment Start Date:**
- Must be in the past or today (cannot be future)
- Format: YYYY-MM-DD
- Empty string treated as null (allowed)
- Null is allowed (optional field)

**Employment End Date:**
- Must be after start date (if both provided)
- Format: YYYY-MM-DD
- Empty string treated as null (allowed)
- Null is allowed (optional field)
- Can be in the future (for planned terminations)

### Pay Validation

**Pay Type:**
- Must be one of: `hourly`, `salary`, or null
- Empty string treated as null
- If `pay_type` is set, `pay_frequency` must be set

**Hourly Rate:**
- Required if `pay_type = 'hourly'`
- Must be >= 0 (cannot be negative)
- Decimal with up to 2 decimal places
- Empty string treated as null
- Null allowed only if `pay_type != 'hourly'`

**Salary Amount:**
- Required if `pay_type = 'salary'`
- Must be >= 0 (cannot be negative)
- Decimal with up to 2 decimal places
- Empty string treated as null
- Null allowed only if `pay_type != 'salary'`

**Pay Frequency:**
- Required if `pay_type` is set
- Must be one of: `weekly`, `fortnightly`, `monthly`
- Empty string treated as null
- Null allowed only if `pay_type` is null

### Overtime Validation

**Overtime Enabled:**
- Must be boolean (true or false)
- Default: false
- Empty string treated as false

**Overtime Rule Type:**
- Required if `overtime_enabled = true`
- Must be one of: `multiplier`, `flat_extra`
- Empty string treated as null
- Null allowed only if `overtime_enabled = false`

**Overtime Multiplier:**
- Required if `overtime_rule_type = 'multiplier'`
- Must be > 0 (cannot be zero or negative)
- Decimal with up to 2 decimal places
- Typical values: 1.5, 2.0, 1.25
- Empty string treated as null
- Null allowed only if `overtime_rule_type != 'multiplier'`

**Overtime Flat Extra:**
- Required if `overtime_rule_type = 'flat_extra'`
- Must be >= 0 (can be zero or positive)
- Decimal with up to 2 decimal places
- Empty string treated as null
- Null allowed only if `overtime_rule_type != 'flat_extra'`

### Working Rules Validation

**Contracted Weekly Hours:**
- Must be >= 0 (cannot be negative)
- Decimal with up to 2 decimal places
- Empty string treated as null
- Null is allowed (optional field)

**Min Hours Per Week:**
- Must be >= 0 (cannot be negative)
- Decimal with up to 2 decimal places
- Empty string treated as null
- Null is allowed (optional field)
- Cannot exceed `max_hours_per_week` (if both provided)

**Max Hours Per Week:**
- Must be >= 0 (cannot be negative)
- Decimal with up to 2 decimal places
- Empty string treated as null
- Null is allowed (optional field)
- Cannot be less than `min_hours_per_week` (if both provided)

**Max Hours Per Day:**
- Must be > 0 (cannot be zero or negative)
- Decimal with up to 2 decimal places
- Empty string treated as null
- Null is allowed (optional field)

**Max Consecutive Days:**
- Must be > 0 (cannot be zero or negative)
- Integer (whole number)
- Empty string treated as null
- Null is allowed (optional field)

**Min Rest Hours Between Shifts:**
- Must be >= 0 (cannot be negative, can be zero)
- Decimal with up to 2 decimal places
- Empty string treated as null
- Null is allowed (optional field)

**Preferred Working Days:**
- Must be array of integers
- Each integer must be 0-6 (0=Sunday, 6=Saturday)
- Duplicates ignored (deduplicate array)
- Empty array treated as null
- Null is allowed (optional field)
- Empty string treated as null (not an array)

**Preferred Shift Types:**
- Must be array of strings
- Each string must be one of: `morning`, `evening`, `night`
- Case-insensitive (normalize to lowercase)
- Duplicates ignored (deduplicate array)
- Empty array treated as null
- Null is allowed (optional field)
- Empty string treated as null (not an array)

### Contact Validation

**Email:**
- Must be valid email format (if provided)
- Empty string treated as null (allowed)
- Null is allowed (optional field)
- Basic format check: contains @ and valid domain

**Phone:**
- Basic format validation (if provided)
- Empty string treated as null (allowed)
- Null is allowed (optional field)
- Accepts international formats (no strict validation)

**Emergency Contact Phone:**
- Same validation as phone field
- Empty string treated as null (allowed)
- Null is allowed (optional field)

### Manager Validation

**Manager ID:**
- Must be valid UUID format (if provided)
- Must reference a valid staff record in the same tenant
- Cannot reference the same staff record (prevent self-reference)
- Empty string treated as null (allowed)
- Null is allowed (optional field, means no manager)

**Circular Reference Prevention:**
- If staff A has manager B, then staff B cannot have manager A (prevent direct circular reference)
- If staff A has manager B, and staff B has manager C, then staff C cannot have manager A (prevent indirect circular reference)
- Implementation: Check manager chain up to reasonable depth (e.g., 5 levels) to prevent circular references

### URL/Query Param Validation

**Tab Parameter:**
- Valid values: `profile`, `employment`, `pay`, `hours-rules`, `availability`, `documents`
- Invalid values default to `profile`
- Empty string treated as `profile`
- Case-insensitive (normalize to lowercase)

**Staff ID Parameter:**
- Must be valid UUID format
- Invalid format returns 404 Not Found
- Empty string returns 404 Not Found

### Empty String and Null Handling

**General Rule:**
- Empty strings (`""`) are treated as `null` for all optional fields
- Empty strings are rejected for required fields (show validation error)
- `null` values are allowed for all optional fields
- `null` values are stored as `NULL` in database (not empty string)

**Array Fields:**
- Empty arrays (`[]`) are treated as `null`
- Empty strings are treated as `null` (not an array)
- `null` values are allowed

**Boolean Fields:**
- Empty strings are treated as `false`
- `null` values are treated as `false` (default)
- Only `true` and `false` are valid

---

## 11. Acceptance Tests (QA Checklist)

### Tenant Isolation Tests

**Test 1: Staff Cannot Access Admin Endpoint (Cross-Tenant)**
- Given: Staff member A in Tenant 1, Staff member B in Tenant 2
- When: Staff A calls `GET /api/staff/[B's ID]`
- Then: Returns 403 Forbidden (staff are forbidden from `/api/staff/[id]` endpoint regardless of tenant; endpoint check happens before tenant check)

**Test 2: Admin Cannot See Other Tenant's Staff**
- Given: Admin in Tenant 1, Staff member in Tenant 2
- When: Admin calls `GET /api/staff/[Staff's ID]`
- Then: Returns 404 Not Found (staff record not in same tenant)

**Test 3: Staff List Only Shows Own Tenant**
- Given: Admin in Tenant 1, Staff members in Tenant 1 and Tenant 2
- When: Admin calls `GET /api/staff`
- Then: Returns only staff from Tenant 1, excludes Tenant 2 staff

### Role/Permission Tests

**Test 4: Staff Cannot Access Admin Endpoint**
- Given: Staff member A in tenant
- When: Staff A calls `GET /api/staff/[any ID]`
- Then: Returns 403 Forbidden (staff are forbidden from /api/staff/[id] endpoint, must use /api/me/staff-profile)

**Test 5: Staff Can View Their Own Record**
- Given: Staff member A with `user_id` linked
- When: Staff A calls `GET /api/me/staff-profile`
- Then: Returns staff A's record successfully

**Test 6: Staff Cannot Access Admin Update Endpoint**
- Given: Staff member A in tenant
- When: Staff A calls `PUT /api/staff/[any ID]` with valid data
- Then: Returns 403 Forbidden (staff are forbidden from /api/staff/[id] endpoint, must use /api/me/staff-profile)

**Test 7: Staff Cannot Update Admin Fields**
- Given: Staff member A updating their own record
- When: Staff A calls `PUT /api/me/staff-profile` with `job_title` field
- Then: Returns 403 Forbidden with error message about forbidden fields

**Test 8: Manager Cannot Delete Staff**
- Given: Manager role in tenant
- When: Manager calls `DELETE /api/staff/[ID]`
- Then: Returns 403 Forbidden (only admin/superadmin can delete)

**Test 9: Admin Can Update Any Staff in Tenant**
- Given: Admin role in tenant, Staff member in same tenant
- When: Admin calls `PUT /api/staff/[ID]` with admin fields
- Then: Returns 200 OK, staff record updated successfully

**Test 10: Staff Cannot View Sensitive Fields**
- Given: Staff member A viewing their own record
- When: Staff A calls `GET /api/me/staff-profile`
- Then: Response does not include `national_insurance_number` field

**Test 11: Admin Can View Sensitive Fields**
- Given: Admin role in tenant
- When: Admin calls `GET /api/staff/[ID]`
- Then: Response includes `national_insurance_number` field (if set)

### Staff Self-Service Tests

**Test 12: Staff Can Update Their Own Profile Fields**
- Given: Staff member A with `user_id` linked
- When: Staff A calls `PUT /api/me/staff-profile` with `preferred_name` and `email`
- Then: Returns 200 OK, staff record updated with new values

**Test 13: Staff Update Rejects Forbidden Fields**
- Given: Staff member A updating their own record
- When: Staff A calls `PUT /api/me/staff-profile` with `job_title` in request body
- Then: Returns 403 Forbidden, error message lists forbidden fields, record not updated

**Test 14: Staff Update Validates Date of Birth**
- Given: Staff member A updating their own record
- When: Staff A calls `PUT /api/me/staff-profile` with `date_of_birth` set to future date
- Then: Returns 400 Bad Request, validation error message, record not updated

**Test 15: Staff Update Allows Null Values**
- Given: Staff member A with existing `preferred_name` value
- When: Staff A calls `PUT /api/me/staff-profile` with `preferred_name: null`
- Then: Returns 200 OK, `preferred_name` set to null in database

**Test 16: Staff Update Handles Empty Strings**
- Given: Staff member A with existing `preferred_name` value
- When: Staff A calls `PUT /api/me/staff-profile` with `preferred_name: ""`
- Then: Returns 200 OK, `preferred_name` set to null in database (empty string converted to null)

### Admin Update Tests

**Test 17: Admin Can Update All Fields**
- Given: Admin role in tenant
- When: Admin calls `PUT /api/staff/[ID]` with all field types (staff-entered and admin-entered)
- Then: Returns 200 OK, all fields updated successfully

**Test 18: Admin Update Validates Pay Rules**
- Given: Admin updating staff record
- When: Admin calls `PUT /api/staff/[ID]` with `pay_type: 'hourly'` but `hourly_rate: null`
- Then: Returns 400 Bad Request, validation error, record not updated

**Test 19: Admin Update Validates Overtime Rules**
- Given: Admin updating staff record
- When: Admin calls `PUT /api/staff/[ID]` with `overtime_enabled: true` but `overtime_rule_type: null`
- Then: Returns 400 Bad Request, validation error, record not updated

**Test 20: Admin Update Validates Min/Max Hours**
- Given: Admin updating staff record
- When: Admin calls `PUT /api/staff/[ID]` with `min_hours_per_week: 40` and `max_hours_per_week: 20`
- Then: Returns 409 Conflict, validation error (min cannot exceed max), record not updated

**Test 21: Admin Update Prevents Manager Self-Reference**
- Given: Admin updating staff record
- When: Admin calls `PUT /api/staff/[ID]` with `manager_id` set to the same staff member's ID
- Then: Returns 409 Conflict, validation error (cannot be own manager), record not updated

**Test 22: Admin Update Prevents Circular Manager References**
- Given: Staff A with manager B, Staff B with manager C
- When: Admin tries to set Staff C's manager to Staff A
- Then: Returns 409 Conflict, validation error (circular reference), record not updated

**Test 23: Admin Update Creates Status History with Defaults**
- Given: Admin updating staff record with status change
- When: Admin calls `PUT /api/staff/[ID]` with `status: 'on_leave'` (changed from 'active') without status_change_effective_date or status_change_reason
- Then: Returns 200 OK, staff record updated, API creates new entry in `staff_status_history` table with old_status='active', new_status='on_leave', effective_date=today (current date), reason=null, changed_by=authenticated user's ID

**Test 23a: Admin Update Creates Status History with Provided Values**
- Given: Admin updating staff record with status change
- When: Admin calls `PUT /api/staff/[ID]` with `status: 'on_leave'`, `status_change_effective_date: '2025-01-15'`, `status_change_reason: 'Medical leave'`
- Then: Returns 200 OK, staff record updated, API creates new entry in `staff_status_history` table with old_status (from before update), new_status='on_leave', effective_date='2025-01-15', reason='Medical leave', changed_by=authenticated user's ID

**Test 24: Admin Update Validates Manager in Same Tenant**
- Given: Admin in Tenant 1, Staff A in Tenant 1, Staff B in Tenant 2
- When: Admin calls `PUT /api/staff/[A's ID]` with `manager_id: B's ID`
- Then: Returns 409 Conflict, validation error (manager must be in same tenant), record not updated

### Validation Failure Tests

**Test 25: Invalid Email Format Rejected**
- Given: Staff member updating profile
- When: Staff calls `PUT /api/me/staff-profile` with `email: 'not-an-email'`
- Then: Returns 400 Bad Request, validation error message

**Test 26: Invalid Date Format Rejected**
- Given: Staff member updating profile
- When: Staff calls `PUT /api/me/staff-profile` with `date_of_birth: 'invalid-date'`
- Then: Returns 400 Bad Request, validation error message

**Test 27: Invalid UUID Format Rejected**
- Given: Admin updating staff record
- When: Admin calls `PUT /api/staff/[ID]` with `manager_id: 'not-a-uuid'`
- Then: Returns 400 Bad Request, validation error message

**Test 28: Invalid Enum Value Rejected**
- Given: Admin updating staff record
- When: Admin calls `PUT /api/staff/[ID]` with `pay_type: 'invalid-value'`
- Then: Returns 400 Bad Request, validation error message

**Test 29: Invalid Array Values Rejected**
- Given: Admin updating staff record
- When: Admin calls `PUT /api/staff/[ID]` with `preferred_working_days: [0, 1, 7]` (7 is invalid, must be 0-6)
- Then: Returns 400 Bad Request, validation error message

**Test 30: Negative Values Rejected for Hours**
- Given: Admin updating staff record
- When: Admin calls `PUT /api/staff/[ID]` with `min_hours_per_week: -5`
- Then: Returns 400 Bad Request, validation error message

### UI Behavior Tests

**Test 31: Tab Deep Linking Works**
- Given: Admin viewing staff detail page
- When: Admin navigates to `/staff/[ID]?tab=pay`
- Then: Pay tab is active and displayed, URL reflects tab parameter

**Test 32: Invalid Tab Parameter Defaults**
- Given: Admin viewing staff detail page
- When: Admin navigates to `/staff/[ID]?tab=invalid-tab`
- Then: Profile tab is active (default), invalid tab ignored

**Test 33: Text Selection Does Not Trigger Navigation**
- Given: Admin viewing staff list or detail page
- When: Admin selects text in email or phone field
- Then: Text is selected, row/card click does not navigate (text selection takes priority)

**Test 34: Unsaved Changes Warning**
- Given: Admin in edit mode with unsaved changes
- When: Admin tries to switch tabs or navigate away
- Then: Warning dialog appears asking to confirm navigation, changes can be saved or discarded

**Test 35: Status Change Modal Works**
- Given: Admin in Employment tab edit mode
- When: Admin changes status dropdown
- Then: Modal appears with current status, new status dropdown, effective date picker, reason textarea, Cancel and Confirm buttons

**Test 36: Status Change Modal Creates History Entry**
- Given: Admin changing staff status via modal in Employment tab
- When: Admin confirms status change with effective date '2025-01-15' and reason 'Medical leave'
- Then: PUT /api/staff/[ID] called with status, status_change_effective_date='2025-01-15', and status_change_reason='Medical leave', API updates status and creates history entry with provided values, modal closes, page refreshes to show new status

**Test 37: Mobile Responsive Layout**
- Given: User on mobile device (<768px width)
- When: User views staff detail page
- Then: Tabs are horizontal scrollable, form fields stack vertically, buttons are full width, header elements stack

**Test 38: Loading States Display**
- Given: Admin navigating to staff detail page
- When: Page is loading staff data
- Then: Skeleton loader or spinner displays, form is disabled

**Test 39: Error States Display**
- Given: Admin viewing staff detail page
- When: API call fails (network error, 500 error)
- Then: Error message displays with retry button, user can retry request

**Test 40: Success Feedback After Save**
- Given: Admin in edit mode
- When: Admin saves changes successfully
- Then: Success message displays (toast or inline), form returns to view mode, updated data is displayed

---

## 12. Definition of Done

**Migrations Applied:**
- Migration file created and applied to database
- All new columns added to `staff` table
- `staff_status_history` table created
- All indexes created
- API implementation creates status history entries (not database trigger)
- All constraints added
- RLS policies updated
- Migration tested on dev database
- Rollback procedure documented

**RLS Verified:**
- Tenant isolation enforced (staff cannot see other tenant's records)
- Staff self-service restrictions enforced (staff can only update their own record with whitelisted fields)
- Admin/manager permissions enforced (can update any staff in tenant)
- Delete permissions enforced (only admin/superadmin)
- Sensitive fields protected (staff cannot view `national_insurance_number`)

**API Passes Tests:**
- All acceptance tests from section 11 pass
- All endpoints return correct status codes
- All validation rules enforced
- All error cases handled correctly
- Backward compatibility maintained for existing endpoints

**UI Passes Tests:**
- All UI behavior tests from section 11 pass
- All tabs work correctly
- Edit mode works correctly
- Status change modal works correctly
- Unsaved changes guard works correctly
- Loading/error/empty states display correctly
- Mobile responsive layout works correctly

**Types Updated:**
- TypeScript types regenerated from database
- `supabase-types.ts` updated with new fields
- All TypeScript compilation passes (no errors)
- All type definitions match database schema

**Build Passes:**
- `npm run build` completes successfully
- No TypeScript errors
- No lint errors
- No runtime errors in build output
- All pages load correctly in production build

---

**End of Specification**
