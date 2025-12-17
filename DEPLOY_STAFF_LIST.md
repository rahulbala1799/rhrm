# 🚀 Staff List Page - Deployment Guide

## Quick Deploy

Run the deployment script:

```bash
./deploy-staff-list.sh
```

This script will:
1. ✅ Verify Supabase CLI is installed
2. ✅ Check Supabase authentication
3. ✅ Verify database state (no new migrations needed)
4. ✅ Stage only staff list related files
5. ✅ Commit with descriptive message
6. ✅ Push to git (triggers deployment)

## Manual Deployment Steps

If you prefer to deploy manually:

### Step 1: Verify Supabase (No Migrations Needed)

```bash
# Check if logged in
npx supabase projects list

# Verify project is linked (if needed)
npx supabase status
```

**Important**: No new database migrations are required! The staff list page uses the existing `staff` table and RLS policies.

### Step 2: Stage Files

```bash
# Stage only staff list related files
git add apps/web/app/\(dashboard\)/staff/page.tsx
git add apps/web/app/\(dashboard\)/staff/README.md
git add apps/web/app/\(dashboard\)/staff/components/
git add apps/web/app/api/staff/route.ts
git add DEPLOY_STAFF_LIST.md
git add STAFF_LIST_IMPLEMENTATION_PLAN.md
```

### Step 3: Commit

```bash
git commit -m "feat: ship staff list page with pagination, filters, and validation

- Add pagination support to GET /api/staff (page, pageSize, total, totalPages)
- Implement debounced search with URL persistence
- Add status and location filters
- Create skeleton loading states
- Add mobile-responsive card layout
- Implement URL parameter validation and sanitization
- Fix text selection behavior (no accidental navigation)
- Add permission-based UI (Add Staff button visibility)
- Complete README documentation

All features production-ready with comprehensive error handling."
```

### Step 4: Push to Git

```bash
# Push to main branch (triggers deployment)
git push origin main
```

## What Gets Deployed

### New Files
- ✅ `apps/web/app/(dashboard)/staff/components/StaffTableSkeleton.tsx`
- ✅ `apps/web/app/(dashboard)/staff/components/StaffFilters.tsx`
- ✅ `apps/web/app/(dashboard)/staff/components/StaffPagination.tsx`
- ✅ `apps/web/app/(dashboard)/staff/components/StaffCard.tsx`
- ✅ `apps/web/app/(dashboard)/staff/README.md`

### Modified Files
- ✅ `apps/web/app/(dashboard)/staff/page.tsx` (complete rewrite)
- ✅ `apps/web/app/api/staff/route.ts` (added pagination)

### Documentation
- ✅ `DEPLOY_STAFF_LIST.md` (this file)
- ✅ `STAFF_LIST_IMPLEMENTATION_PLAN.md`

## Database Requirements

**✅ No new migrations needed!**

The staff list page uses:
- Existing `staff` table (already created)
- Existing RLS policies (already in place)
- Existing `locations` table (for filter dropdown)
- Existing `memberships` table (for permissions)

**Verify existing migrations are applied:**
```bash
npx supabase migration list
```

All migrations should show as applied. If any are missing:
```bash
npx supabase db push
```

## Environment Variables

**No new environment variables needed!**

Existing variables (already set):
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (if used)

## Post-Deployment Testing

### 1. Basic Functionality
- [ ] Visit `/staff` page
- [ ] Staff list displays correctly
- [ ] No console errors
- [ ] Loading states work

### 2. Search & Filters
- [ ] Search works (debounced, 400ms)
- [ ] Status filter works
- [ ] Location filter works
- [ ] URL parameters persist

### 3. Pagination
- [ ] Pagination appears (if >25 staff)
- [ ] Page navigation works
- [ ] Filters persist when paging

### 4. Text Selection
- [ ] Can select/copy email
- [ ] Can select/copy phone
- [ ] Row click still works when not selecting

### 5. Permissions
- [ ] Staff role: No "Add Staff" button
- [ ] Manager/Admin: "Add Staff" button visible

### 6. Mobile Responsive
- [ ] Mobile shows cards (not table)
- [ ] Cards are clickable
- [ ] Layout looks good on mobile

### 7. URL Validation
- [ ] `?page=0` → defaults to 1
- [ ] `?page=-1` → defaults to 1
- [ ] `?page=abc` → defaults to 1
- [ ] `?pageSize=1000` → caps at 100
- [ ] `?status=banana` → ignored
- [ ] `?location_id=invalid` → ignored

## Rollback (If Needed)

If issues arise:

```bash
# Revert the commit
git revert HEAD

# Push revert
git push origin main
```

**Note**: No database rollback needed (no migrations were added).

## Troubleshooting

### Build Fails
- Check TypeScript errors: `cd apps/web && npm run build`
- Check linting errors: `cd apps/web && npm run lint`
- Verify all imports are correct

### Page Doesn't Load
- Check browser console for errors
- Verify Supabase connection
- Check environment variables are set
- Verify RLS policies allow access

### Filters Don't Work
- Check API route is deployed
- Verify URL parameters are being sent
- Check browser network tab for API calls

### Pagination Doesn't Work
- Verify API returns pagination metadata
- Check page/pageSize params in URL
- Verify total count is correct

## Support

If you encounter issues:
1. Check browser console
2. Check deployment platform logs
3. Verify Supabase connection
4. Test with different user roles
5. Review README for implementation details

---

**Ready? Run `./deploy-staff-list.sh` or follow manual steps above!** 🚀
