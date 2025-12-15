# Manual Setup Instructions

Since Supabase login requires browser interaction, please run these commands in your terminal:

## Step 1: Login to Supabase

```bash
npx supabase login
```

This will:
- Open your browser
- Ask you to authenticate with Supabase
- Save your access token locally

## Step 2: Link Your Project

```bash
npx supabase link --project-ref urewrejmncnbdxrlrjyf
```

You'll be prompted for:
- **Database password**: The password you set when creating your Supabase project
  - If you forgot it: Supabase Dashboard > Settings > Database > Reset password

## Step 3: Run Migrations

```bash
npx supabase db push
```

This will:
- Create all tables (tenants, profiles, memberships, etc.)
- Set up RLS policies
- Create helper functions
- Set up audit triggers
- Configure storage policies

## Step 4: Verify Migrations

Check in Supabase Dashboard > Table Editor:
- You should see all tables created
- Check that RLS is enabled on tenant-scoped tables

## Alternative: Run Migrations via SQL Editor

If linking doesn't work, you can run migrations manually:

1. Go to Supabase Dashboard > SQL Editor
2. Copy and paste each migration file from `supabase/migrations/` in order
3. Run them one by one (001, 002, 003, etc.)

## After Migrations

1. **Set up storage buckets** (Supabase Dashboard > Storage):
   - `compliance-docs` (private, 10MB)
   - `exports` (private, 50MB)

2. **Configure auth** (Supabase Dashboard > Authentication):
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`

3. **Start the app**:
   ```bash
   npm run dev:web
   ```

## Quick Command Reference

```bash
# Login (opens browser)
npx supabase login

# Link project
npx supabase link --project-ref urewrejmncnbdxrlrjyf

# Run migrations
npx supabase db push

# Start app
npm run dev:web
```

---

**Ready? Open your terminal and run the commands above!** 🚀

