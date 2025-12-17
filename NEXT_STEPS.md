# Next Steps - Ready to Deploy!

## ✅ What's Done

1. ✅ **Environment variables configured** (`apps/web/.env.local`)
   - Project URL: `https://urewrejmncnbdxrlrjyf.supabase.co`
   - Anon key: Set
   - Service role key: Set (gitignored - safe!)
   
2. ✅ **Supabase CLI installed** (as dev dependency)
   - Use: `npx supabase <command>`

3. ✅ **Git repository initialized**
   - Ready to push to GitHub

4. ✅ **Auth UI built**
   - Login, Signup, Password Reset pages ready

## 🚀 Next Steps (In Order)

### Step 1: Link to Supabase Project

```bash
# Login to Supabase (opens browser)
npx supabase login

# Link to your project
npx supabase link --project-ref urewrejmncnbdxrlrjyf
```

**When prompted for database password:**
- Use the password you set when creating the Supabase project
- Or check: Supabase Dashboard > Settings > Database > Database password

### Step 2: Run Database Migrations

```bash
# Push all migrations to create tables, RLS policies, functions
npx supabase db push
```

This will create:
- All tables (tenants, profiles, memberships, etc.)
- RLS policies for tenant isolation
- Helper functions (is_tenant_owner, create_tenant_with_admin, etc.)
- Audit triggers
- Storage policies

### Step 3: Set Up Storage Buckets

In **Supabase Dashboard > Storage**:

1. **Create bucket: `compliance-docs`**
   - Public: **No**
   - File size limit: **10MB**
   - Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`

2. **Create bucket: `exports`**
   - Public: **No**
   - File size limit: **50MB**
   - Allowed MIME types: `text/csv`, `application/vnd.ms-excel`

### Step 4: Configure Auth Redirects

In **Supabase Dashboard > Authentication > URL Configuration**:

1. **Site URL**: `http://localhost:3000`
2. **Redirect URLs**: Add:
   - `http://localhost:3000/auth/callback`

### Step 5: Test the App

```bash
# Install dependencies (if not done)
npm install

# Start development server
npm run dev:web
```

Visit **http://localhost:3000**:
1. Click "Sign up" to create an account
2. Sign in with your new account
3. Test the auth flow!

### Step 6: Push to GitHub

```bash
# Add all files (except .env.local - already gitignored)
git add .

# Commit
git commit -m "Initial commit: HR & Staff Management System"

# Add remote (you provided this)
git remote add origin https://github.com/rahulbala1799/rhrm.git

# Push to main
git branch -M main
git push -u origin main
```

## 🔒 Security Check

Your `.env.local` file is **automatically gitignored** (via `.gitignore`):
- ✅ Service role key is safe
- ✅ Won't be committed to GitHub
- ✅ Only exists locally

## 📋 Verification Checklist

After running migrations, verify in Supabase Dashboard:

- [ ] **Table Editor**: All tables visible (tenants, profiles, memberships, etc.)
- [ ] **Authentication > Users**: Can see test users after signup
- [ ] **Storage**: `compliance-docs` and `exports` buckets created
- [ ] **Database > Functions**: Functions like `create_tenant_with_admin` exist
- [ ] **Database > Policies**: RLS policies are active

## 🐛 Troubleshooting

### "Database password incorrect"
- Check Supabase Dashboard > Settings > Database
- Reset password if needed

### "Migration failed"
- Check Supabase Dashboard > Logs
- Verify project is linked: `npx supabase projects list`

### "Cannot connect to Supabase"
- Verify `.env.local` has correct values
- Check Supabase project is active

## 🎯 What's Next After Setup?

1. ✅ Auth is working
2. Create tenant creation UI
3. Build dashboard
4. Add team member invitations
5. Start building features!

## 📚 Documentation

- **Setup Guide**: `SETUP.md`
- **Quick Start**: `QUICK_START.md`
- **Architecture**: `ARCHITECTURE.md`
- **Supabase CLI Install**: `INSTALL_SUPABASE_CLI.md`

---

**Ready? Run these commands:**

```bash
npx supabase login
npx supabase link --project-ref urewrejmncnbdxrlrjyf
npx supabase db push
npm run dev:web
```

Then visit http://localhost:3000 and start building! 🚀


