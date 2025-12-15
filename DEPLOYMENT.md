# Vercel Deployment Guide

## Prerequisites

✅ **Completed:**
- [x] Next.js app configured in `apps/web`
- [x] Supabase database migrations applied
- [x] Environment variables documented
- [x] Vercel configuration file created
- [x] GitHub repository connected

## Step 1: Connect GitHub Repository to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Select your GitHub repository: `rahulbala1799/rhrm`
4. Vercel will auto-detect Next.js

### Option B: Via Vercel CLI

```bash
cd apps/web
vercel login
vercel link
```

## Step 2: Configure Project Settings

In Vercel Dashboard → Your Project → Settings → General:

### Framework Preset
- **Framework**: Next.js
- **Root Directory**: `apps/web` ⚠️ **IMPORTANT for monorepo!**
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (auto-detected)

### Environment Variables

Go to **Settings → Environment Variables** and add:

#### Required Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://urewrejmncnbdxrlrjyf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZXdyZWptbmNuYmR4cmxyanlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTI5MzMsImV4cCI6MjA4MTM4ODkzM30.WP7uLb_xveW4pgu_ZMJE19twNiA4VF8Q0BrABuaDWgo

# Service Role Key (Server-side only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App URL (Set after first deployment)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**⚠️ Important:**
- Select **all environments** (Production, Preview, Development) for public variables
- Select **Production only** for `SUPABASE_SERVICE_ROLE_KEY`
- Replace `your-service-role-key-here` with your actual service role key from Supabase Dashboard

## Step 3: Deploy

### Automatic Deployment (via GitHub)

Once connected:
1. Push to `main` branch → Auto-deploys to **Production**
2. Push to other branches → Auto-deploys to **Preview**

### Manual Deployment

```bash
cd apps/web
vercel --prod
```

## Step 4: Post-Deployment Configuration

### 1. Update Supabase Auth Redirect URLs

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication → URL Configuration**
4. Add these URLs:

```
Site URL: https://your-app.vercel.app
Redirect URLs:
  - https://your-app.vercel.app/auth/callback
  - https://your-app.vercel.app/**
```

### 2. Update NEXT_PUBLIC_APP_URL

1. In Vercel Dashboard → Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
3. Redeploy (or wait for next push)

### 3. Test the Deployment

1. Visit your Vercel URL
2. Test login flow
3. Verify Supabase connection
4. Check console for errors

## Project Structure

```
/
├── vercel.json          # Root-level Vercel config (for GitHub)
├── apps/
│   └── web/             # Next.js app (rootDirectory)
│       ├── app/         # Next.js App Router
│       ├── lib/         # Utilities
│       ├── package.json
│       ├── next.config.js
│       └── vercel.json  # Local CLI config (optional)
```

## Troubleshooting

### Build Fails: "Cannot find module"

**Solution:**
- Verify **Root Directory** is set to `apps/web` in Vercel settings
- Check that `package.json` exists in `apps/web`

### Build Fails: "Environment variable not found"

**Solution:**
- Go to Vercel Dashboard → Environment Variables
- Ensure all required variables are set
- Select correct environments (Production/Preview/Development)

### 404 Errors on Routes

**Solution:**
- Verify `next.config.js` is correct
- Check that middleware is properly configured
- Ensure API routes are in `app/api/` directory

### Authentication Not Working

**Solution:**
- Verify Supabase redirect URLs are configured
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Ensure `NEXT_PUBLIC_APP_URL` matches your Vercel domain

### Monorepo Issues

**Solution:**
- Root Directory must be `apps/web`
- Build command should run from root: `cd apps/web && npm run build`
- Install command: `cd apps/web && npm install`

## Environment Variables Reference

| Variable | Required | Environment | Description |
|----------|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | All | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | All | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Production | Server-side operations only |
| `NEXT_PUBLIC_APP_URL` | ✅ | All | Your Vercel deployment URL |

## Deployment Checklist

- [ ] GitHub repository connected to Vercel
- [ ] Root Directory set to `apps/web`
- [ ] All environment variables configured
- [ ] Supabase redirect URLs updated
- [ ] First deployment successful
- [ ] Login flow tested
- [ ] API routes working
- [ ] Production URL saved

## Quick Deploy Commands

```bash
# Check Vercel status
cd apps/web
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# List environment variables
vercel env ls
```

---

**Ready to deploy?** Push to GitHub and Vercel will automatically build and deploy! 🚀

