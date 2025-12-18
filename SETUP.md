# Setup Guide - HR & Staff Management System

## Prerequisites

- Node.js 18+ installed
- Supabase account (https://supabase.com)
- Supabase CLI installed: `npm install -g supabase`

## Step 1: Supabase Project Setup

### Option A: Using Supabase Dashboard (Recommended for Production)

1. Go to https://supabase.com and create a new project
2. Note down your project credentials:
   - Project URL: `https://your-project.supabase.co`
   - Anon/Public Key: Found in Settings > API
   - Service Role Key: Found in Settings > API (keep this secret!)

### Option B: Using Supabase CLI (Local Development)

```bash
# Login to Supabase
supabase login

# Link to your remote project
supabase link --project-ref your-project-ref

# Or start local Supabase
supabase start
```

## Step 2: Environment Variables

Create `.env.local` in `apps/web/`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: Never commit `.env.local` to git (already in `.gitignore`)

## Step 3: Run Database Migrations

### For Remote Supabase (Production/Staging)

```bash
# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push

# Or apply migrations one by one
supabase migration up
```

### For Local Supabase (Development)

```bash
# Start local Supabase (if not running)
supabase start

# Reset database (applies all migrations + seed)
supabase db reset

# Or apply migrations manually
supabase migration up
```

## Step 4: Verify Migrations

Check that all tables are created:

```bash
# Using Supabase CLI
supabase db diff

# Or check in Supabase Dashboard > Table Editor
```

Expected tables:
- `tenants`
- `profiles`
- `memberships`
- `locations`
- `staff`
- `availability`
- `shifts`
- `timesheets`
- `compliance_documents`
- `invitations`
- `notifications`
- `audit_logs`
- `platform_admins`

## Step 5: Set Up Storage Buckets

In Supabase Dashboard > Storage:

1. Create bucket: `compliance-docs`
   - Public: No
   - File size limit: 10MB
   - Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`

2. Create bucket: `exports`
   - Public: No
   - File size limit: 50MB
   - Allowed MIME types: `text/csv`, `application/vnd.ms-excel`

Storage policies are set up in migration `20240101000008_storage_setup.sql`

## Step 6: Configure Auth

In Supabase Dashboard > Authentication > Settings:

1. **Site URL**: Set to your app URL (e.g., `http://localhost:3000` for dev)
2. **Redirect URLs**: Add your callback URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`
3. **Email Auth**: Enable email/password signup
4. **Email Confirmations**: Configure as needed (disabled for dev, enabled for prod)

## Step 7: Install Dependencies & Run

```bash
# From root directory
npm install

# Or install per app
cd apps/web && npm install

# Start development server
npm run dev:web
# Or: cd apps/web && npm run dev
```

Visit `http://localhost:3000` and you should see the login page.

## Step 8: Create First User & Tenant

1. Sign up at `/signup` or use the login form
2. After signup, you'll need to create your first tenant
3. The tenant creation flow will:
   - Create the tenant
   - Set you as the owner
   - Create your admin membership

## Troubleshooting

### Migration Errors

If migrations fail:
```bash
# Check migration status
supabase migration list

# Rollback last migration
supabase migration down

# Check for errors in Supabase Dashboard > Logs
```

### Auth Issues

- Verify environment variables are set correctly
- Check Supabase Dashboard > Authentication > Users
- Check browser console for errors
- Verify redirect URLs match in Supabase settings

### RLS Policy Issues

- All tenant-scoped tables have RLS enabled
- Policies require active membership
- Check `audit_logs` table for permission errors

## Next Steps

After setup:
1. ✅ Auth UI is ready (login, signup, password reset)
2. Create your first tenant
3. Invite team members
4. Start building features!

## Production Deployment

See `README.md` for Vercel deployment instructions.




