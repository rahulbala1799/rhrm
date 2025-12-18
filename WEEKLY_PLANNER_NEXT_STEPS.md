# Weekly Planner System - Next Steps

## ✅ Completed

1. **Database Migration Created**: `20251219000000_weekly_planner_system.sql`
2. **Utility Functions**: `apps/web/lib/schedule/utils.ts`
3. **API Endpoints**: All 7 endpoints implemented
4. **Code Committed**: All changes pushed to git

## 🔄 Next Steps

### Step 1: Apply Database Migration

The migration needs to be applied to your Supabase database. You have two options:

#### Option A: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Copy the contents of `supabase/migrations/20251219000000_weekly_planner_system.sql`
5. Paste and run the SQL
6. Verify tables are created:
   - `tenant_settings` ✓
   - `shift_audit_log` ✓

#### Option B: Via Supabase CLI

```bash
# Apply just the weekly planner migration
npx supabase migration up --include-all
```

**Note**: There's a conflict with `20251218000000_staff_detail_system.sql` migration. If you encounter errors, use Option A instead.

### Step 2: Verify Migration

After applying the migration, verify in Supabase Dashboard:

1. **Tables Created**:
   - `tenant_settings` (with columns: tenant_id, timezone, staff_can_accept_decline_shifts)
   - `shift_audit_log` (with all required columns)

2. **RLS Policies Updated**:
   - Staff shift update policy should check `tenant_settings.staff_can_accept_decline_shifts`

3. **Indexes Created**:
   - `idx_tenant_settings_tenant_id`
   - `idx_shift_audit_log_*` (multiple indexes)

### Step 3: Initialize Tenant Settings

For existing tenants, settings will be auto-created by the migration trigger. For new tenants, settings are created automatically.

To set a custom timezone for a tenant:

```sql
UPDATE tenant_settings 
SET timezone = 'Europe/London' 
WHERE tenant_id = 'your-tenant-id';
```

### Step 4: Test API Endpoints

Test the endpoints locally:

```bash
# Start dev server
npm run dev:web

# Test endpoints (use your auth token):
# GET /api/schedule/week?weekStart=2024-12-16
# POST /api/schedule/shifts
# PUT /api/schedule/shifts/[id]
# DELETE /api/schedule/shifts/[id]
```

### Step 5: Implement UI (Next Phase)

According to the README build order, the next phase is:

1. **Core UI Components**:
   - `WeekPlannerPage` component
   - `WeekPlannerHeader` component
   - `WeekPlannerGrid` component
   - `DayColumn` component
   - `ShiftBlock` component
   - `ShiftModal` component

2. **Drag and Drop** (using `@dnd-kit`)

3. **Right-Click Context Menus**

4. **Advanced Features** (multi-select, keyboard navigation, etc.)

## 📋 API Endpoints Ready

All endpoints are implemented and ready to use:

- ✅ `GET /api/schedule/week` - Fetch shifts for a week
- ✅ `POST /api/schedule/shifts` - Create shift
- ✅ `PUT /api/schedule/shifts/[id]` - Update shift
- ✅ `DELETE /api/schedule/shifts/[id]` - Delete shift
- ✅ `POST /api/schedule/shifts/bulk` - Bulk operations
- ✅ `GET /api/schedule/availability` - Get availability
- ✅ `GET /api/schedule/conflicts` - Get conflicts

## 🔍 Key Features Implemented

- ✅ Tenant isolation via RLS
- ✅ Staff permissions controlled by tenant setting
- ✅ Conflict detection (overlap = 409, availability/rules = warnings)
- ✅ Audit logging for all mutations
- ✅ Timezone handling (tenant timezone authoritative)
- ✅ Week boundary calculations
- ✅ Cancelled shift visibility controls

## 📚 Documentation

Full specification available at:
`apps/web/app/(dashboard)/schedule/week/WEEKLY_PLANNER_README.md`

