# Architecture: Membership-Based Multi-Tenancy

## Key Design Decision: Membership-Based RLS (Not JWT Claims)

This implementation uses **membership table lookups** for tenant context, NOT JWT custom claims. This is a critical architectural decision based on real-world multi-tenant SaaS requirements.

## Why Not JWT Claims?

### Problems with JWT Claims Approach

1. **Stale Claims**: JWT tokens don't refresh when roles change, invitations are accepted, or staff are moved
2. **Tenant Switching Complexity**: Requires token refresh, edge function calls, and can cause weird bugs
3. **Multi-Tenant Users**: Users belonging to multiple tenants need token manipulation
4. **Debugging Difficulty**: "Token voodoo" instead of checking membership rows
5. **Real-World Reality**: In HR/retail/care, people belong to multiple tenants sooner than you think

### Benefits of Membership-Based Approach

1. **Always Current**: Membership table is source of truth, always up-to-date
2. **Simple Tenant Switching**: Just change cookie/localStorage, no token refresh
3. **Multi-Tenant Support**: Users can belong to multiple tenants naturally
4. **Easy Debugging**: Check `memberships` table directly
5. **Database-Enforced**: RLS policies check membership existence, not token claims

## Implementation

### RLS Policies

**Requirement**: All tenant-scoped tables must have `tenant_id NOT NULL` and RLS enabled by default.

All policies use helper functions that check the `memberships` table:

```sql
-- Instead of: auth.jwt()->>'tenant_id'
-- We use: public.user_has_membership(auth.uid(), tenant_id)

CREATE POLICY staff_select_policy_admin ON staff
    FOR SELECT
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
    );
```

**Helper Function Permissions**:
- `GRANT EXECUTE` to `authenticated` role (required for RLS policies to evaluate)
- `REVOKE EXECUTE` from `anon` and `public` roles
- Functions are safe: fixed `search_path = public`, no data leakage
- Service role can execute regardless (bypasses RLS), but functions are designed for authenticated sessions

### Tenant Context Resolution

**Web App (Next.js)**:
- Active tenant stored in cookie `active_tenant_id` - non-httpOnly, UI state only
- `getTenantContext()` looks up membership from database
- Verifies user has active membership in tenant
- Falls back to first active membership if no cookie
- **Security**: `active_tenant_id` is non-sensitive UI state; do not store roles/permissions in client storage
- Cookies for auth session are httpOnly (handled by Supabase), but `active_tenant_id` can be non-httpOnly as it's just UI state

**Mobile App (Expo)**:
- Active tenant stored in SecureStore key `active_tenant_id`
- Same lookup pattern as web app
- Supports tenant switching without token refresh
- **Offline Behavior**: If no network, use cached `active_tenant_id` but **block writes** until membership verification succeeds
  - Prevents "offline writes to wrong tenant" edge cases
  - Read operations can use cached tenant context
  - Write operations require network + membership verification

**Worker (Railway)**:
- Uses service role key (bypasses RLS)
- All actions logged with `user_id = NULL` (system)

### Superadmin Access

**Important**: Superadmin access is **server-side only**.

**Ops Model**:
- No client-level RLS policies for superadmin
- All superadmin operations via `/api/superadmin/*` endpoints
- **Platform-level identity**: Superadmin identity is NOT membership-based
  - Checked against `platform_admins` allowlist table
  - Prevents "any admin" from accessing superadmin endpoints if a bug slips in
- **Explicit tenant scoping**: Every request must include `tenantId` (no global browse)
- **Actor tracking**: All actions log `actor_user_id` (superadmin) and `acting_as_user_id` (if impersonating)
- Heavy audit logging required with full context
- Prevents accidental "god-mode" access

## Data Flow

### Authentication Flow

1. User signs in → Supabase Auth issues JWT (standard, no custom claims)
2. Client stores JWT in cookie/SecureStore
3. User selects active tenant → stored in cookie/localStorage
4. On each request, `getTenantContext()`:
   - Reads active tenant from cookie
   - Verifies membership exists in database
   - Returns tenant context

### Data Access Flow

1. Client makes request with JWT
2. **App must include `tenant_id` in queries** (RLS doesn't "automatically filter" - it enforces)
3. RLS policy checks: `user_has_membership(auth.uid(), tenant_id)` via WITH CHECK
4. If membership exists and is active → query executes
5. If no membership → query returns empty or errors (RLS blocks)

**Critical**: Every INSERT must set `tenant_id` and RLS WITH CHECK must validate it.

### Background Job Flow

1. Railway worker uses service role key
2. Bypasses RLS for system operations
3. All actions logged to `audit_logs` with `user_id = NULL`
4. Can access all tenants (system operations)

## Storage Security

### Path Structure

```
/tenants/{tenant_id}/
  /compliance/
    /{staff_id}/
      {document_id}_{filename}
  /exports/
    /payroll/
      {date}_{export_id}.csv
```

### Policies

- **Shared buckets** (not separate buckets per tenant)
- **Path-based isolation**: `/tenants/{tenant_id}/...`
- **Compliance Docs**: 
  - **Staff uploads (own documents)**: 
    - Staff record must have `user_id` linked to auth user
    - Path: `/tenants/{tenant_id}/compliance/{staff_id}/...`
    - Policy checks: user has membership in tenant AND `staff.user_id = auth.uid()`
  - **Staff without account**: 
    - If `staff.user_id` is NULL, staff cannot upload directly
    - Admin/manager must upload on their behalf
  - **Admin uploads on behalf**: 
    - Admins/managers can upload to any staff's path
    - Policy checks: user has admin/manager role in tenant
  - **Admin downloads**: 
    - Admins/managers can **list + download** files under their tenant paths (not just view)
    - Explicitly includes download permissions, not just listing
  - File type limits: PDF, JPG, PNG only
  - File size limits: 10MB max
  - Malware scanning: Future implementation required
- **Exports**: Admin-only, time-limited signed URLs (24h)
- **Path Validation**: Helper functions extract tenant_id from path

## Audit Logging

### What Gets Logged

- All CREATE, UPDATE, DELETE on critical tables
- Sensitive reads (payroll exports)
- System actions (background jobs)
- Role changes (privilege escalation risk)

### Actor Tracking

- `user_id`: Authenticated user (NULL for system actions)
- `tenant_id`: Tenant context (NULL for cross-tenant system actions)
- `acting_as_user_id`: User being impersonated (for superadmin operations)
- `actor_user_id`: Actual user performing action (in changes JSONB)
- `changes`: JSONB with before/after for updates, plus actor metadata

## API Routes (Sensitive Operations)

All sensitive operations go through Next.js API routes (in `apps/web/app/api/`):

- `/api/invitations/send` - Requires admin role
- `/api/exports/payroll` - Requires admin role, uses service role for data
- `/api/tenants/switch` - Validates membership before switching
- `/api/tenants/transfer-ownership` - Owner transfer (server-side only)
- `/api/invitations/accept` - Invitation acceptance (server-side only)

**Critical Rule**: All server endpoints must validate `tenantId` against memberships for the current user before performing any action.

Server-side validation ensures:
1. Extract `tenantId` from request (never trust client state alone)
2. Verify user has active membership in that tenant
3. Verify user has required role in that tenant
4. Action is logged to audit_logs with proper actor tracking

## Mobile App Pattern

### Direct Supabase Client (with RLS)

- Read operations (shifts, timesheets, availability)
- Real-time subscriptions
- File uploads to Storage

### API Client (Server Endpoints)

- Sensitive writes (timesheet approval, staff creation)
- Payroll exports
- Invitation sending
- Operations requiring service role

## Testing Strategy

### RLS Testing

**Recommended**: Test via Supabase client sessions (the way the app actually runs):

```typescript
// Test as different users with Supabase client
const supabase = createClient(SUPABASE_URL, ANON_KEY)
await supabase.auth.signInWithPassword({ email, password })
const { data } = await supabase.from('staff').select('*')
// Should only see own tenant's data (RLS enforced)
```

**SQL-level testing** (for advanced debugging only):
- Only works in local Supabase with direct DB access
- Not recommended for production testing
- Use Supabase client sessions instead

### Cross-Tenant Isolation

```typescript
// Test 1: SELECT from another tenant (should return empty)
const { data, error } = await supabase
  .from('staff')
  .select('*')
  .eq('tenant_id', 'other-tenant-id')

// RLS can either return empty array or throw error
// Both behaviors are correct - RLS is blocking access
if (error || !data || data.length === 0) {
  // RLS successfully blocked cross-tenant access
}

// Test 2: INSERT into another tenant (WITH CHECK should error)
const { data: insertData, error: insertError } = await supabase
  .from('staff')
  .insert({
    tenant_id: 'other-tenant-id', // User doesn't have membership
    first_name: 'Test',
    last_name: 'User',
    employee_number: '123',
  })

// WITH CHECK policy should reject this - must error
if (insertError) {
  // RLS successfully blocked cross-tenant insert
  console.assert(insertError.message.includes('permission') || insertError.code === '42501')
}
```

## Migration from JWT Claims (If Needed)

If you have existing JWT claims setup:

1. Remove edge function that updates JWT claims
2. Update all RLS policies to use membership lookups
3. Update client code to use `getTenantContext()` instead of JWT claims
4. Add tenant switching UI (cookie/localStorage management)

## Performance Considerations

### Indexes

- `memberships(tenant_id, user_id)` - Composite unique index
- `memberships(user_id, status)` - For user's active memberships
- All `tenant_id` columns indexed for RLS performance

### Query Optimization

- RLS policies use indexed lookups
- Helper functions marked as `STABLE` for query planner
- Membership checks are fast (indexed foreign keys)

## Security Guarantees

1. **Tenant Isolation**: RLS enforces membership checks at database level
2. **No Token Manipulation**: Can't fake tenant_id in JWT (we don't use it)
3. **Multi-Tenant Safe**: Users can belong to multiple tenants without conflicts
4. **Role Changes Immediate**: No token refresh needed when roles change
5. **Audit Trail**: All actions logged with proper actor tracking

## Tenant Creation & First Admin Onboarding

**Canonical Flow**: Atomic operation to avoid deadlock.

**IMPORTANT**: This is the ONLY allowed path for tenant creation:
- API endpoint `/api/tenants/create` calls database function `create_tenant_with_admin()`
- Database function ensures atomicity (both operations succeed or fail together)
- No other path is allowed - prevents devs from adding "quick tenant creation" elsewhere

The problem:
- User signs up but can't create tenant (not a member)
- Can't create membership (no tenant exists)

The solution:
- `/api/tenants/create` endpoint uses service role to call database function
- Database function `create_tenant_with_admin()` ensures atomicity
- Creates tenant + first admin membership in single transaction
- First user becomes admin automatically

## RLS Helper Functions Security

All helper functions use:
- `SECURITY DEFINER` - Runs with function owner's privileges
- `SET search_path = public` - Prevents search_path injection attacks
- `STABLE` - Marked for query planner optimization
- **Execute permissions**: 
  - `GRANT EXECUTE` to `authenticated` role (required for RLS policies to evaluate)
  - `REVOKE EXECUTE` from `anon` and `public` roles
  - Service role can execute regardless (bypasses RLS), but functions are designed for authenticated sessions

This prevents accidental RLS bypass vectors.

## Role Hierarchy

**v1 roles are coarse by design**:
- Current roles: `superadmin`, `admin`, `manager`, `staff`
- Role hierarchy is simple: superadmin > admin > manager > staff
- Finer permissions will be implemented later via permission tables
- This prevents overloading the role field into a "monster" later

Future enhancements:
- Location-specific managers
- Department-based permissions
- Feature flags per role
- All via separate permission tables, not role enum expansion

## Future Enhancements

1. **Impersonation**: Full `acting_as` metadata in audit logs (partially implemented)
2. **Tenant Switching UI**: Dropdown to switch between tenants
3. **Membership Invitations**: Email-based onboarding flow
4. **Permission Tables**: Finer-grained permissions (location-specific, department-based, etc.)
5. **Malware Scanning**: For compliance document uploads

