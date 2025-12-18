# Staff List Visibility Flow

## When Does a New Staff Member Appear in the Staff List?

### Timeline

1. **Staff completes onboarding** → `POST /api/staff-onboarding/complete`
   - Creates staff record with `status: 'active'`
   - Sets `created_at` timestamp
   - Returns success response

2. **Staff record is immediately available** in database
   - No delay or queue
   - Record exists with `tenant_id`, `status: 'active'`

3. **Staff list page loads** → `GET /api/staff`
   - Fetches all staff for current tenant
   - **Default behavior**: Shows ALL staff (no status filter by default)
   - **Sorting**: `created_at DESC` (newest first)
   - **Pagination**: 25 per page (default)

4. **Staff appears on page 1** (if sorted by newest first)
   - Since sorting is `created_at DESC`, newest staff appears at the top
   - Should be visible immediately after creation

### Conditions for Visibility

A staff member will appear in the list if:

✅ **Required:**
- `tenant_id` matches current tenant
- Staff record exists in database

⚠️ **May be filtered out if:**
- Status filter is applied (e.g., "Active" filter when status is not 'active')
- Search filter doesn't match (name, email, employee number)
- Location filter doesn't match
- They're on a different page (if many staff members)

### Current Issue Analysis

Based on your debug output:
- ✅ Staff record exists: `John Bosco` (ID: `f5fda98f-861a-4a01-802f-8494a5a5fa05`)
- ✅ Status is `active`
- ✅ Has `tenant_id` matching your tenant
- ✅ Created at: `2025-12-17T21:59:45.241714+00:00`

**The staff should be visible!**

### Troubleshooting Steps

1. **Check the staff list page URL:**
   - Should be: `/staff` (no filters)
   - If you see `?status=active` or other filters, clear them

2. **Check pagination:**
   - Make sure you're on page 1
   - With only 1 staff member, they should definitely be on page 1

3. **Check browser cache:**
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - Or clear cache and reload

4. **Check if there's a search term:**
   - Clear any search input
   - Search might be filtering them out

5. **Verify the API response:**
   - Open browser DevTools → Network tab
   - Go to `/staff` page
   - Check the `/api/staff` request
   - See if the staff member is in the response

### Expected Behavior

**Immediate visibility:**
- Staff should appear **immediately** after onboarding completion
- No refresh needed (if page is already open, it will show on next fetch)
- If you're on the staff list page, you might need to refresh to see them

**Sorting:**
- Newest staff appears at the **top** of the list (first row)
- Since there's only 1 staff member, they should be the only row visible

### API Query Details

The staff list API query:
```sql
SELECT * FROM staff
WHERE tenant_id = <your_tenant_id>
ORDER BY created_at DESC
-- No status filter by default
-- Pagination: 25 per page
```

Since your staff member:
- Has `tenant_id` matching
- Has `status = 'active'`
- Was created recently (should be first in DESC order)

They **should definitely be visible** on page 1, row 1.

