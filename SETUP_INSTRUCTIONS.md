# Setup Instructions for Your Supabase Project

## Your Project Details

- **Project URL**: `https://urewrejmncnbdxrlrjyf.supabase.co`
- **Project Reference**: `urewrejmncnbdxrlrjyf`
- **Database**: `rhrm`

## Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

## Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

## Step 3: Link Your Project

```bash
supabase link --project-ref urewrejmncnbdxrlrjyf
```

You'll be prompted for your database password. Use the password you set when creating the project (or check Supabase Dashboard > Settings > Database).

## Step 4: Verify Environment Variables

Check that `apps/web/.env.local` exists and has:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://urewrejmncnbdxrlrjyf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_SD2ck5CKVyEKfkxxsmtQiQ_0BAP6TuU
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: The service role key is already in `.env.local` and is gitignored (safe).

## Step 5: Run Migrations

```bash
# Push all migrations to your Supabase database
supabase db push
```

This will create all tables, RLS policies, functions, and triggers.

## Step 6: Set Up Storage Buckets

In Supabase Dashboard > Storage:

1. **Create bucket: `compliance-docs`**
   - Public: **No**
   - File size limit: **10MB**
   - Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`

2. **Create bucket: `exports`**
   - Public: **No**
   - File size limit: **50MB**
   - Allowed MIME types: `text/csv`, `application/vnd.ms-excel`

## Step 7: Configure Auth Redirects

In Supabase Dashboard > Authentication > URL Configuration:

1. **Site URL**: `http://localhost:3000`
2. **Redirect URLs**: Add:
   - `http://localhost:3000/auth/callback`
   - `https://your-production-domain.com/auth/callback` (for later)

## Step 8: Start the App

```bash
# Install dependencies (if not done)
npm install

# Start development server
npm run dev:web
```

Visit **http://localhost:3000** and test the auth flow!

## Verify Setup

After running migrations, check in Supabase Dashboard:

1. **Table Editor**: Should see all tables (tenants, profiles, memberships, etc.)
2. **Authentication > Users**: Should be empty (or have test users)
3. **Storage**: Should have `compliance-docs` and `exports` buckets
4. **Database > Functions**: Should see functions like `create_tenant_with_admin`, `is_tenant_owner`, etc.

## Troubleshooting

### "Database password incorrect"
- Check Supabase Dashboard > Settings > Database
- Reset password if needed

### "Migration failed"
- Check Supabase Dashboard > Logs
- Verify you're linked to correct project: `supabase projects list`

### "RLS policy error"
- All migrations should run successfully
- Check `audit_logs` table for any permission issues

## Next Steps

✅ Environment variables set
✅ Ready to link project
✅ Ready to run migrations

**Run these commands:**
```bash
supabase login
supabase link --project-ref urewrejmncnbdxrlrjyf
supabase db push
```

Then start building! 🚀



