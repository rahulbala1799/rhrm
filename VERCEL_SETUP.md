# Vercel Deployment Setup

## Step 1: Navigate to Web App Directory

Since this is a monorepo, you need to work from the `apps/web` directory:

```bash
cd apps/web
```

## Step 2: Login to Vercel

```bash
vercel login
```

This will:
- Open your browser
- Ask you to authenticate with Vercel
- Save your credentials locally

## Step 3: Link Project to Vercel

```bash
vercel link
```

**When prompted, answer:**

1. **Set up and develop?** → `Y` (Yes)
2. **Which scope?** → Select your Vercel account/team
3. **Link to existing project?** → `N` (No - create new project)
4. **What's your project's name?** → `rhrm` (or your preferred name)
5. **In which directory is your code located?** → `./` (current directory)

## Step 4: Configure Environment Variables

After linking, add your environment variables in Vercel Dashboard:

1. Go to your project in Vercel Dashboard
2. Settings → Environment Variables
3. Add these variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://urewrejmncnbdxrlrjyf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZXdyZWptbmNuYmR4cmxyanlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTI5MzMsImV4cCI6MjA4MTM4ODkzM30.WP7uLb_xveW4pgu_ZMJE19twNiA4VF8Q0BrABuaDWgo
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

**Important**: Replace `your-service-role-key-here` with your actual service role key from Supabase.

## Step 5: Update Vercel Project Settings

In Vercel Dashboard → Settings → General:

1. **Root Directory**: Set to `apps/web` (important for monorepo!)
2. **Framework Preset**: Next.js
3. **Build Command**: `npm run build` (or leave default)
4. **Output Directory**: `.next` (default)

## Step 6: Deploy

### Deploy to Preview

```bash
vercel
```

### Deploy to Production

```bash
vercel --prod
```

## Quick Command Reference

```bash
# Navigate to web app
cd apps/web

# Login (opens browser)
vercel login

# Link project
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## After Deployment

1. **Update Supabase Auth Redirect URLs**:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your Vercel URL: `https://your-app.vercel.app/auth/callback`

2. **Update NEXT_PUBLIC_APP_URL**:
   - In Vercel Dashboard → Environment Variables
   - Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL

## Troubleshooting

### "Project not found"
- Make sure you're in `apps/web` directory
- Run `vercel link` again

### "Build failed"
- Check that Root Directory is set to `apps/web` in Vercel settings
- Verify all environment variables are set

### "Cannot find module"
- Make sure `package.json` is in `apps/web`
- Vercel should auto-detect Next.js

---

**Ready? Run these commands:**

```bash
cd apps/web
vercel login
vercel link
```

Then follow the prompts! 🚀

