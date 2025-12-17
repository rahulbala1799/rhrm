# Quick Start Guide

Get your HR & Staff Management system up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- Git (for cloning/pushing)

## Step 1: Get Your Supabase Credentials

1. Go to https://supabase.com and sign in
2. Create a new project (or use existing)
3. Go to **Settings > API**
4. Copy these values:
   - **Project URL**: `https://your-project.supabase.co`
   - **anon public key**: (starts with `eyJ...`)
   - **service_role key**: (starts with `eyJ...`) - **Keep this secret!**

## Step 2: Set Environment Variables

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 3: Install Supabase CLI & Link Project

```bash
# Install Supabase CLI globally
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (get project ref from Supabase dashboard URL)
supabase link --project-ref your-project-ref
```

## Step 4: Run Migrations

```bash
# Push all migrations to your Supabase database
supabase db push
```

This will create all tables, RLS policies, functions, and triggers.

## Step 5: Set Up Storage Buckets

In Supabase Dashboard > Storage:

1. **Create bucket: `compliance-docs`**
   - Public: **No**
   - File size limit: **10MB**

2. **Create bucket: `exports`**
   - Public: **No**
   - File size limit: **50MB**

## Step 6: Configure Auth

In Supabase Dashboard > Authentication > URL Configuration:

1. **Site URL**: `http://localhost:3000`
2. **Redirect URLs**: Add `http://localhost:3000/auth/callback`

## Step 7: Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev:web
```

Visit **http://localhost:3000** - you should see the login page!

## Step 8: Create Your First Account

1. Click **"Sign up"** or go to `/signup`
2. Create an account
3. After signup, you'll be redirected to login
4. Sign in with your new account
5. You'll need to create your first tenant (this will be added to the UI next)

## Troubleshooting

### "Cannot connect to Supabase"
- Check your `.env.local` file has correct values
- Verify Supabase project is active

### "Migration failed"
- Check Supabase Dashboard > Logs for errors
- Ensure you have the correct project linked: `supabase projects list`

### "Auth redirect error"
- Verify redirect URLs in Supabase Dashboard > Authentication
- Check `NEXT_PUBLIC_APP_URL` matches your local URL

## Next Steps

✅ Auth is set up and working!
✅ Database schema is ready
✅ RLS policies are active

**What's next?**
- Create tenant creation UI
- Build dashboard
- Add team member invitations
- Start building features!

## Need Help?

- See [SETUP.md](./SETUP.md) for detailed setup
- See [README.md](./README.md) for architecture details
- Check Supabase Dashboard logs for errors



