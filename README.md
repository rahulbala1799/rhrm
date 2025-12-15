# Multi-Tenant HR & Staff Management System

Production-grade multi-tenant HR management platform for retail/trades agencies with scheduling, availability, timesheets, compliance tracking, and payroll export.

**Monorepo Structure**: This project uses a monorepo structure with separate apps for web, mobile, and background workers.

## Architecture

- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth (membership-based, NOT JWT claims)
- **Web App**: Next.js 14 (App Router) deployed on Vercel
- **Mobile Apps**: Expo (unified app with role-based UX)
- **Background Jobs**: Railway worker with service role access
- **Storage**: Supabase Storage with shared buckets, tenant-isolated paths + policies

## Key Security Features

### Membership-Based Multi-Tenancy

**NOT using JWT custom claims for tenant_id**. Instead:

- Tenant context resolved from `memberships` table lookups
- Active tenant stored in cookie `active_tenant_id` (web) or SecureStore `active_tenant_id` (mobile) - UI state only
- **Security**: `active_tenant_id` is non-sensitive UI state; do not store roles/permissions in client storage
- Cookies for auth session are httpOnly (handled by Supabase), but `active_tenant_id` can be non-httpOnly as it's just UI state
- RLS policies check membership existence, not JWT claims
- Supports users belonging to multiple tenants
- Tenant switching without token refresh
- **Mobile offline**: If no network, use cached `active_tenant_id` but block writes until membership verification succeeds

### Row Level Security (RLS)

All tenant-scoped tables use membership-based RLS:

- **All tenant-scoped tables must have `tenant_id NOT NULL` and RLS enabled by default**
- Policies check `user_has_membership(auth.uid(), tenant_id)`
- Policies check `user_has_role_in_tenant(auth.uid(), tenant_id, role)`
- No client-level superadmin access (server-side only)
- Service role key only in Railway worker and server API routes

### Storage Security

- **Shared buckets** with tenant-isolated paths and policies
- Path structure: `/tenants/{tenant_id}/...`
- Bucket policies tied to tenant membership (not separate buckets per tenant)
- Signed URLs for temporary access (24h expiry)
- Staff can upload own documents, admins can view all in tenant
- File type/size limits enforced (configured per bucket)
- Malware scanning: Future implementation required for compliance docs

### Audit Logging

- Database triggers on critical tables (staff, shifts, timesheets, memberships)
- All actions logged with `user_id`, `tenant_id`, `action`, `changes`
- System actions logged with `user_id = NULL`
- Impersonation support via `acting_as` metadata (future)

## Project Structure

```
hr-and-staff/
├── supabase/
│   ├── migrations/          # Database migrations
│   ├── seed.sql             # Seed data
│   └── config.toml          # Supabase CLI config
├── apps/
│   ├── web/                 # Next.js web app (Vercel)
│   │   ├── app/             # Next.js app directory
│   │   │   ├── api/         # API routes (sensitive operations)
│   │   │   └── ...
│   │   ├── lib/             # Shared libraries
│   │   │   ├── auth/        # Tenant context helpers
│   │   │   └── supabase/    # Supabase clients
│   │   ├── middleware.ts    # Next.js middleware
│   │   └── package.json
│   ├── mobile/              # Expo mobile app
│   └── worker/              # Railway background jobs
└── package.json             # Root workspace config
```

## Quick Start

**New to this project?** See [SETUP.md](./SETUP.md) for detailed setup instructions.

**Quick setup:**
1. Install dependencies: `npm install`
2. Set up Supabase (see [SETUP.md](./SETUP.md))
3. Create `.env.local` in `apps/web/` with your Supabase credentials
4. Run migrations: `supabase db push` (or use the setup script)
5. Start dev server: `npm run dev:web`

## Setup

### Prerequisites

- Node.js 18+
- Supabase account and project
- Supabase CLI installed (`npm install -g supabase`)

### Quick Setup Script

We've included a setup script to help you get started:

```bash
# Make script executable (if needed)
chmod +x scripts/setup-supabase.sh

# Run setup script
./scripts/setup-supabase.sh
```

Or follow the manual setup in [SETUP.md](./SETUP.md).

### 1. Local Development

**Option A: From Root (Monorepo)**
```bash
# Install all dependencies
npm install

# Start local Supabase
supabase start

# Run migrations
supabase db reset  # Applies all migrations + seed

# Start web app
npm run dev:web

# Or start other apps
npm run dev:mobile
npm run dev:worker
```

**Option B: Per App**
```bash
# Web app
cd apps/web
npm install
npm run dev

# Mobile app
cd apps/mobile
npm install
npm start

# Worker
cd apps/worker
npm install
npm run dev
```

### 2. Environment Variables

Create `.env.local` in `apps/web/`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # Server-side only

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For Mobile App** (`apps/mobile/.env`):
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_PUBLIC_API_URL=http://localhost:3000
```

**For Worker** (`apps/worker/.env`):
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### 3. Database Migrations

Migrations are in `supabase/migrations/`:

1. `001_initial_schema.sql` - All tables
2. `002_indexes_constraints.sql` - Indexes
3. `003_auth_foundation.sql` - Auth helpers
4. `004_rls_core_tables.sql` - Core RLS policies
5. `005_rls_tenant_tables.sql` - Tenant table RLS
6. `006_rls_shifts_timesheets.sql` - Shifts/timesheets RLS
7. `007_rls_compliance_invitations.sql` - Compliance/invitations RLS
8. `008_rls_notifications_audit.sql` - Notifications/audit RLS
9. `009_storage_setup.sql` - Storage helpers
10. `010_audit_triggers.sql` - Audit logging triggers
11. `011_tenant_creation_function.sql` - Atomic tenant creation function
12. `012_platform_admins.sql` - Platform admins allowlist for superadmin
13. `013_tenant_owner.sql` - Add owner_user_id and owner protection
14. `014_update_tenant_creation_with_owner.sql` - Update tenant creation to set owner
15. `015_protect_owner_membership.sql` - Protect owner membership from other admins
16. `016_owner_transfer_function.sql` - Safe owner transfer procedure
17. `017_fix_profiles_rls_performance.sql` - Optimize profiles RLS policy
18. `018_restrict_sensitive_tenant_fields.sql` - Protect billing/subscription fields
19. `019_invite_only_memberships.sql` - Invite-only onboarding enforcement
20. `020_audit_membership_changes.sql` - Enhanced audit logging for ownership/membership

### 4. Storage Buckets

Create **shared buckets** via Supabase Dashboard:

- `compliance-docs` - Staff compliance documents (shared bucket)
- `exports` - Payroll exports, admin-only (shared bucket)

**Storage Policies** (configure via Dashboard):
- Path-based isolation: `/tenants/{tenant_id}/...`
- Policies check tenant membership via path extraction
- File type limits: PDF, JPG, PNG only for compliance docs
- File size limits: 10MB max per file
- Malware scanning: Plan for future implementation

**Path Structure**:
```
/tenants/{tenant_id}/
  /compliance/
    /{staff_id}/
      {document_id}_{filename}
  /exports/
    /payroll/
      {date}_{export_id}.csv
```

**Storage Ownership Model**:

1. **Staff Uploads (Own Documents)**:
   - Staff record must have `user_id` linked to auth user
   - Staff can upload to `/tenants/{tenant_id}/compliance/{staff_id}/...`
   - Storage policy checks: user has membership in tenant AND staff.user_id = auth.uid()

2. **Staff Without Account**:
   - If `staff.user_id` is NULL, staff cannot upload directly
   - Admin/manager must upload on their behalf
   - Path still uses `staff_id` for organization

3. **Admin Uploads on Behalf**:
   - Admins/managers can upload to any `/tenants/{tenant_id}/compliance/{staff_id}/...`
   - Storage policy checks: user has admin/manager role in tenant
   - Document is linked to staff record via `staff_id` in path
   - **Admins/managers can list + download files** under their tenant paths (not just view)

4. **Exports**:
   - Admin-only access
   - Path: `/tenants/{tenant_id}/exports/payroll/...`
   - Time-limited signed URLs (24h expiry)

## Usage

### Tenant Context

```typescript
// From apps/web/lib/auth/get-tenant-context.ts
import { getTenantContext } from '@/lib/auth/get-tenant-context'

const context = await getTenantContext()
// { tenantId, role, membershipId }
```

### Tenant-Scoped Queries

```typescript
// From apps/web/lib/supabase/tenant-client.ts
import { createTenantClient } from '@/lib/supabase/tenant-client'

const { supabase, tenantId } = await createTenantClient()

// RLS enforces access; explicit tenant_id filters are required for correctness, performance, and predictable query plans
const { data: staff } = await supabase
  .from('staff')
  .select('*')
  .eq('tenant_id', tenantId) // Explicit tenant_id filter required
```

### API Routes (Sensitive Operations)

**Critical Rule**: All server endpoints must validate `tenantId` against memberships for the current user before performing any action.

```typescript
// apps/web/app/api/invitations/send/route.ts
import { verifyTenantAccess } from '@/lib/auth/get-tenant-context'

// 1. Extract tenantId from request
const { tenantId } = await request.json()

// 2. Verify user has membership in that tenant
// 3. Verify user has required role in that tenant
const hasAccess = await verifyTenantAccess(tenantId, 'admin')
if (!hasAccess) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}

// 4. Proceed with action
```

## Deployment

### Vercel (Web App)

1. Push to GitHub
2. Import repo in Vercel
3. **Set root directory to `apps/web`** in Vercel project settings (important!)
4. Add environment variables (same as `.env.local`)
5. Deploy

**Note**: The `vercel.json` in `apps/web/` already specifies `rootDirectory: "apps/web"`, but you should also set it in Vercel dashboard for clarity.

### Railway (Worker)

1. Connect GitHub repo
2. Set root directory to `apps/worker`
3. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy

### Expo (Mobile)

```bash
cd apps/mobile
npm install
expo build:android
expo build:ios
```

**Environment Variables**: Set in `apps/mobile/.env` or via Expo secrets:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL` (your Vercel deployment URL)

## Security Checklist

- [x] RLS enabled on all tenant-scoped tables
- [x] Membership-based access control (not JWT claims)
- [x] Service role key only in worker/server routes
- [x] Storage policies with tenant isolation (shared buckets, path-based)
- [x] Audit logging on critical operations
- [x] Server-side validation for sensitive actions
- [x] **All server endpoints validate tenantId against memberships**
- [x] No client-level superadmin access
- [x] RLS helper functions locked down (SECURITY DEFINER with safe search_path)
- [x] RLS helper functions: Grant execute to authenticated, revoke from anon
- [x] Tenant creation + first admin onboarding flow (atomic operation, canonical path only)
- [x] Superadmin allowlist check (platform_admins table, not membership-based)

## Golden Rules

1. **NEVER** use service role key in client apps
2. **NEVER** disable RLS on tenant-scoped tables
3. **NEVER** trust client-provided tenant_id - always verify membership
4. **NEVER** allow cross-tenant queries without explicit membership check
5. **ALWAYS** validate tenant access server-side for sensitive operations
6. **ALWAYS** validate tenantId in API routes: check membership + role before any action
7. **ALWAYS** use atomic operations for tenant creation + first admin membership
8. **ALWAYS** include `tenant_id` on every INSERT/UPDATE of tenant-scoped tables (and RLS WITH CHECK must validate it)

## Testing

### RLS Policy Testing

**Recommended**: Test via Supabase client sessions (the way the app actually runs):

```typescript
// Test as different users with Supabase client
const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    storage: sessionStorage,
    persistSession: true,
  },
})

// Sign in as test user
await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password',
})

// Should only see own tenant's data (RLS enforced)
const { data } = await supabase.from('staff').select('*')
```

**SQL-level testing** (for advanced debugging):

```sql
-- Only works in local Supabase with direct DB access
-- Not recommended for production testing
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid';

-- Should only see own tenant's data
SELECT * FROM staff;
```

### Cross-Tenant Isolation Test

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

## Background Jobs

Railway worker runs:

- **Shift Reminders**: Daily at 9 AM (24h before shift)
- **Document Expiry Alerts**: Daily at 8 AM (30/14/7 days before)
- **Invitation Expiry**: Daily at midnight

All actions logged to `audit_logs` with `user_id = NULL` (system).

## Superadmin Operations Model

Superadmin access is **server-side only** via API routes:

- **No client-level RLS bypass** - All superadmin operations go through `/api/superadmin/*`
- **Platform-level identity** - Superadmin identity is NOT membership-based
  - Checked against `platform_admins` allowlist table
  - Prevents "any admin" from accessing superadmin endpoints if a bug slips in
- **Explicit tenant scoping** - Every request must include `tenantId` (no global browse)
- **Actor tracking** - All actions log `actor_user_id` (superadmin) and `acting_as_user_id` (if impersonating)
- **Heavy audit logging** - Every superadmin action logged with full context

Example:
```typescript
// Superadmin read tenant data (explicit scoping)
GET /api/superadmin?tenantId=xxx&resourceType=staff

// Superadmin impersonate user
POST /api/superadmin
{
  tenantId: "xxx",
  actingAsUserId: "yyy",
  action: "view",
  resourceType: "timesheets"
}
```

## Tenant Creation & Onboarding

**Canonical Flow**: Create tenant + first admin membership in one atomic operation.

**IMPORTANT**: This is the ONLY allowed path for tenant creation:
- API endpoint `/api/tenants/create` calls database function `create_tenant_with_admin()`
- Database function ensures atomicity (both operations succeed or fail together)
- No other path is allowed - prevents devs from adding "quick tenant creation" elsewhere

This avoids the deadlock:
- User signs up but can't create tenant (not a member)
- Can't create membership (no tenant exists)

**Implementation**:
- `/api/tenants/create` - Uses service role to call database function
- Database function `create_tenant_with_admin()` ensures atomicity
- First user becomes admin automatically

```typescript
POST /api/tenants/create
{
  name: "Acme Retail Ltd",
  slug: "acme-retail"
}
```

## Monorepo Structure

This project uses a monorepo structure with all applications under `/apps/`. This provides:

- **Consistent tooling**: Same deployment patterns, CI/CD setup
- **Shared code**: Common types, utilities can be extracted to packages
- **Easier maintenance**: Single repo for all related code
- **Clear separation**: Each app has its own dependencies and config

### Applications

- **`/apps/web`** - Next.js 14 web app (deployed on Vercel)
  - Next.js App Router
  - API routes for sensitive operations (`/app/api/`)
  - Tenant context management (`/lib/auth/`)
  - Server-side validation
  - Own `package.json`, `tsconfig.json`, `next.config.js`

- **`/apps/mobile`** - Expo unified mobile app
  - Role-based UX (admin/staff views)
  - Direct Supabase client with RLS
  - API client for sensitive operations
  - Offline support with cached tenant context
  - Own `package.json`, `app.json`

- **`/apps/worker`** - Railway background jobs
  - Service role access only
  - Scheduled jobs (shift reminders, document expiry, etc.)
  - System-level audit logging
  - Own `package.json`, `tsconfig.json`, `railway.json`

### Shared Resources

- **`/supabase`** - Database migrations and configuration
  - All migrations in chronological order
  - Seed data for development
  - Supabase CLI configuration

- **Root `package.json`** - Workspace configuration
  - Defines workspace scripts for convenience
  - Uses npm workspaces (`apps/*`)
  - Can manage shared dependencies across apps (future)
  - Run `npm install` from root to install all app dependencies

### Running Apps

**From root (recommended)**:
```bash
npm run dev:web      # Start web app (port 3000)
npm run dev:mobile   # Start mobile app (Expo)
npm run dev:worker   # Start worker (dev mode)
```

**From individual app directories**:
```bash
cd apps/web && npm run dev
cd apps/mobile && npm start
cd apps/worker && npm run dev
```

## License

Proprietary
