# Staff List Page - Implementation Plan

## Overview
This document outlines the complete implementation plan for building a production-quality Staff List page that meets all requirements while maintaining security, performance, and excellent UX.

## Architecture & Security

### Tenant Isolation
- **RLS Policies**: All staff queries are automatically scoped to `tenant_id` via Row Level Security
- **API Layer**: `getTenantContext()` ensures all API calls include tenant context
- **Client-Side**: No tenant_id in client code - all filtering happens server-side

### RLS Policies (Already Implemented)

#### Staff Table Policies
```sql
-- Admin: Full CRUD on staff in their tenant
CREATE POLICY staff_select_policy_admin ON staff
    FOR SELECT USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );

-- Manager: Read, insert, update (no delete)
CREATE POLICY staff_select_policy_manager ON staff
    FOR SELECT USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'manager')
    );

-- Staff: Can read all staff in their tenant (for list view)
CREATE POLICY staff_select_policy_staff ON staff
    FOR SELECT USING (
        public.user_has_membership(auth.uid(), tenant_id)
    );
```

**Key Points:**
- All users with active membership can view the staff list (required for the page)
- Only admin/manager/superadmin can create staff (enforced in API)
- RLS automatically filters by `tenant_id` - no manual filtering needed in queries
- Policies use `user_has_role_in_tenant()` helper function for role checks

### Permission Model

**Viewing Staff List:**
- **Allowed**: All authenticated users with active membership
- **Enforcement**: RLS policy `staff_select_policy_staff` allows any member to read
- **API**: `GET /api/staff` uses `getTenantContext()` which validates membership

**Creating Staff:**
- **Allowed**: `admin`, `manager`, `superadmin` only
- **Enforcement**: 
  - API: `POST /api/staff` checks role via `getTenantContext()`
  - UI: Button visibility based on role from `/api/auth/role`
- **RLS**: `staff_insert_policy_admin` and `staff_insert_policy_manager` enforce at DB level

## Implementation Details

### 1. API Enhancements

#### A. Add Pagination to GET /api/staff

**Current State**: Returns all staff (no pagination)
**Required**: Add `page` and `pageSize` query params with `total` in response

**Implementation:**
```typescript
// Query params
const page = parseInt(searchParams.get('page') || '1')
const pageSize = parseInt(searchParams.get('pageSize') || '25')

// Count total (before pagination)
const { count } = await supabase
  .from('staff')
  .select('*', { count: 'exact', head: true })
  .eq('tenant_id', tenantId)

// Apply pagination
const from = (page - 1) * pageSize
const to = from + pageSize - 1
query = query.range(from, to)

// Response
return NextResponse.json({
  staff: staff || [],
  pagination: {
    page,
    pageSize,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize)
  }
})
```

**Backward Compatibility:**
- If `page`/`pageSize` not provided, return all results (current behavior)
- Existing consumers continue to work
- New consumers can opt into pagination

#### B. Location Filter Endpoint

**Current State**: `/api/settings/locations` exists but returns full location objects
**Required**: Simple endpoint for dropdown (id + name only)

**Solution**: Use existing endpoint, filter response in client, OR create minimal endpoint
- **Decision**: Use existing endpoint, extract `{id, name}` in client
- **Alternative**: Add query param `?minimal=true` to existing endpoint

### 2. Frontend Implementation

#### A. State Management

```typescript
interface StaffListState {
  staff: Staff[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  filters: {
    search: string
    status: string
    locationId: string
  }
  userRole: string | null
}
```

#### B. URL Query Parameters

**Required Params:**
- `search`: Text search (debounced)
- `status`: active | on_leave | terminated | (empty for all)
- `location_id`: UUID or empty
- `page`: Current page number (default: 1)
- `pageSize`: Items per page (default: 25)

**Implementation:**
- Use `useSearchParams()` from Next.js
- Update URL on filter change (via `router.push()`)
- Read from URL on mount
- Shareable URLs work automatically

#### C. Debounced Search

**Implementation:**
```typescript
const [searchInput, setSearchInput] = useState('')
const [debouncedSearch, setDebouncedSearch] = useState('')

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchInput)
    // Update URL param
  }, 400)
  return () => clearTimeout(timer)
}, [searchInput])
```

#### D. Loading States

**Skeleton Table:**
```tsx
// Show 5 skeleton rows
{loading && (
  <tbody>
    {[...Array(5)].map((_, i) => (
      <tr key={i} className="animate-pulse">
        <td><div className="h-4 bg-gray-200 rounded w-20"></div></td>
        <td><div className="h-4 bg-gray-200 rounded w-32"></div></td>
        // ... more skeleton cells
      </tr>
    ))}
  </tbody>
)}
```

**Shimmer Effect:**
- Use Tailwind `animate-pulse` class
- Subtle gray background with rounded corners
- Match actual content dimensions

#### E. Error Handling

**Error States:**
- **401 Unauthorized**: "Please sign in to view staff"
- **403 Forbidden**: "You don't have permission to view this page"
- **500 Server Error**: "Something went wrong. Please try again."
- **Network Error**: "Unable to connect. Check your connection."

**UI:**
```tsx
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <p className="text-red-800">{error}</p>
    <button onClick={retry}>Retry</button>
  </div>
)}
```

#### F. Mobile Responsive Design

**Desktop (>768px):**
- Full table with all columns
- Hover states on rows
- Click name or row to navigate

**Mobile (<768px):**
- Card-based layout
- Each card shows:
  - Name + Status badge (top row)
  - Employee # + Location + Type (middle)
  - Contact info (bottom)
- Tap entire card to navigate

**Implementation:**
```tsx
<div className="hidden md:block">
  {/* Desktop table */}
</div>
<div className="md:hidden space-y-4">
  {/* Mobile cards */}
</div>
```

#### G. Pagination Component

**Requirements:**
- Show "X staff" count
- Prev/Next buttons
- Page numbers (if totalPages <= 7, show all; else show first, last, current ±2)
- Disable Prev on page 1, Next on last page
- Keep filters when paging

**Implementation:**
```tsx
<div className="flex items-center justify-between">
  <p className="text-sm text-gray-600">
    Showing {from} to {to} of {total} staff
  </p>
  <div className="flex gap-2">
    <button disabled={page === 1}>Previous</button>
    {/* Page numbers */}
    <button disabled={page === totalPages}>Next</button>
  </div>
</div>
```

### 3. Permission Checks

#### A. Add Staff Button

**Client-Side:**
```typescript
useEffect(() => {
  fetch('/api/auth/role')
    .then(res => res.json())
    .then(data => {
      const canCreate = ['admin', 'manager', 'superadmin'].includes(data.role)
      setCanCreateStaff(canCreate)
    })
}, [])
```

**Server-Side (API):**
- Already enforced in `POST /api/staff`
- Returns 403 if role insufficient

#### B. Staff Detail Access

- All authenticated members can view staff details (RLS allows)
- Edit/Delete buttons shown only to admin/manager (handled in detail page)

### 4. Data Formatting

#### A. Status Badges
- **Active**: `bg-green-100 text-green-800`
- **On Leave**: `bg-yellow-100 text-yellow-800`
- **Terminated**: `bg-red-100 text-red-800`
- Format: Capitalize and replace underscores

#### B. Employment Type
```typescript
const formatEmploymentType = (type: string | null) => {
  const map: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    casual: 'Casual',
    contractor: 'Contractor'
  }
  return type ? map[type] || type : '—'
}
```

#### C. Contact Display
- Email on first line (or "—" if missing)
- Phone on second line, smaller text, gray color (or "—" if missing)

#### D. Location
- Show `locations.name` or "—" if null
- Handle missing location gracefully

### 5. Component Structure

```
apps/web/app/(dashboard)/staff/
├── page.tsx (Main Staff List Page)
├── components/
│   ├── StaffTable.tsx (Desktop table)
│   ├── StaffCard.tsx (Mobile card)
│   ├── StaffFilters.tsx (Filter bar)
│   ├── StaffPagination.tsx (Pagination controls)
│   └── StaffTableSkeleton.tsx (Loading skeleton)
└── README.md (Documentation)
```

### 6. Testing Checklist

**Before Shipping:**
- [ ] No TypeScript errors
- [ ] Lint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Empty state displays correctly
- [ ] Loading skeleton shows during fetch
- [ ] Error states handle all error codes
- [ ] Search debouncing works (400ms delay)
- [ ] Filters persist in URL
- [ ] Pagination works with filters
- [ ] Mobile responsive (test on <768px)
- [ ] Permission checks work (hide button for staff role)
- [ ] Staff detail navigation works
- [ ] URL sharing works (copy/paste URL with filters)
- [ ] Performance: No unnecessary re-renders
- [ ] Accessibility: Keyboard navigation works
- [ ] RLS: Cannot see other tenant's staff

## Migration Requirements

### None Required
- All necessary tables exist
- RLS policies are in place
- API structure supports requirements (with pagination addition)

### Optional Enhancements (Future)
- Add index on `staff.tenant_id` (if not exists) for performance
- Add index on `staff.status` for faster filtering
- Add composite index on `(tenant_id, status)` for common queries

## Security Considerations

### 1. Tenant Isolation
- ✅ RLS policies enforce tenant boundaries
- ✅ API validates tenant context
- ✅ No tenant_id in client-side code
- ✅ All queries filtered by tenant_id server-side

### 2. Permission Enforcement
- ✅ Role checks in API (server-side)
- ✅ UI hides actions based on role (UX only, not security)
- ✅ RLS policies enforce at database level

### 3. Input Validation
- ✅ Search input sanitized (Supabase handles SQL injection)
- ✅ Query params validated (page/pageSize are integers)
- ✅ Status filter validated against allowed values

### 4. Data Exposure
- ✅ No sensitive data in URLs (only filters)
- ✅ Staff list shows only non-sensitive fields
- ✅ National Insurance numbers not in list view

## Performance Optimizations

### 1. Database
- Use existing indexes on `tenant_id`
- Pagination reduces data transfer
- Filters applied at database level

### 2. Frontend
- Debounced search reduces API calls
- Skeleton loading improves perceived performance
- Memoized components prevent unnecessary renders
- URL-based state enables browser back/forward

### 3. Caching
- Consider adding React Query or SWR for caching
- Not required for MVP, but improves UX

## Accessibility

### Requirements
- ✅ Keyboard navigation (Tab through filters, Enter to search)
- ✅ Screen reader support (ARIA labels)
- ✅ Focus states visible
- ✅ Color contrast meets WCAG AA
- ✅ Semantic HTML (table for desktop, cards for mobile)

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- No IE11 support required

## Deployment Checklist

- [ ] Code review completed
- [ ] All tests pass
- [ ] TypeScript compilation succeeds
- [ ] Linting passes
- [ ] Build succeeds
- [ ] RLS policies verified in staging
- [ ] Permission checks tested with different roles
- [ ] Mobile responsive verified
- [ ] Performance tested with 100+ staff records
- [ ] Error handling tested
- [ ] URL sharing tested

## Rollback Plan

If issues arise:
1. Revert commit
2. Deploy previous version
3. No database changes required (no migrations)

## Future Enhancements

1. **Bulk Actions**: Select multiple staff, bulk update status
2. **Export**: Export staff list to CSV
3. **Advanced Filters**: Date range, employment type, location group
4. **Sorting**: Click column headers to sort
5. **Saved Views**: Save filter combinations
6. **Real-time Updates**: WebSocket for live updates
7. **Staff Linking**: Auto-create staff record from profile after onboarding

