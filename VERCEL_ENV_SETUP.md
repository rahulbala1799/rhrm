# Vercel Environment Variables Setup

## Quick Setup Commands

Run these commands from `apps/web` directory:

```bash
cd apps/web
```

### 1. Add Supabase URL

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
```

**When prompted:**
- **Value**: `https://urewrejmncnbdxrlrjyf.supabase.co`
- **Environments**: Select `production`, `preview`, and `development` (or just `production`)

### 2. Add Supabase Anon Key

```bash
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

**When prompted:**
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZXdyZWptbmNuYmR4cmxyanlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTI5MzMsImV4cCI6MjA4MTM4ODkzM30.WP7uLb_xveW4pgu_ZMJE19twNiA4VF8Q0BrABuaDWgo`
- **Environments**: Select `production`, `preview`, and `development` (or just `production`)

### 3. Add Service Role Key (SECRET)

```bash
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

**When prompted:**
- **Value**: Paste your service role key (from `.env.local` or Supabase Dashboard)
- **Environments**: Select `production`, `preview`, and `development` (or just `production`)
- **Note**: This will be hidden/masked in Vercel dashboard for security

### 4. Add App URL (Update After First Deployment)

```bash
vercel env add NEXT_PUBLIC_APP_URL production
```

**When prompted:**
- **Value**: `https://your-app.vercel.app` (replace with your actual Vercel URL after first deployment)
- **Environments**: Select `production`, `preview`, and `development` (or just `production`)

## Alternative: Add All at Once

You can also add variables for all environments:

```bash
# Add to production, preview, and development
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Select: production, preview, development
# Paste value

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Select: production, preview, development
# Paste value

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Select: production, preview, development
# Paste value (will be hidden)

vercel env add NEXT_PUBLIC_APP_URL
# Select: production, preview, development
# Paste your Vercel URL
```

## Verify Environment Variables

```bash
# List all environment variables
vercel env ls
```

## Update Existing Variables

```bash
# Remove old value
vercel env rm VARIABLE_NAME production

# Add new value
vercel env add VARIABLE_NAME production
```

## After Adding Variables

1. **Redeploy** to apply changes:
   ```bash
   vercel --prod
   ```

2. **Update Supabase Auth Redirect URLs**:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add: `https://your-app.vercel.app/auth/callback`

3. **Update NEXT_PUBLIC_APP_URL** if needed:
   ```bash
   vercel env rm NEXT_PUBLIC_APP_URL production
   vercel env add NEXT_PUBLIC_APP_URL production
   # Paste your actual Vercel URL
   ```

## Quick Copy-Paste Values

**NEXT_PUBLIC_SUPABASE_URL:**
```
https://urewrejmncnbdxrlrjyf.supabase.co
```

**NEXT_PUBLIC_SUPABASE_ANON_KEY:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZXdyZWptbmNuYmR4cmxyanlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTI5MzMsImV4cCI6MjA4MTM4ODkzM30.WP7uLb_xveW4pgu_ZMJE19twNiA4VF8Q0BrABuaDWgo
```

**SUPABASE_SERVICE_ROLE_KEY:**
(Get from your `.env.local` file or Supabase Dashboard → Settings → API → service_role key)

**NEXT_PUBLIC_APP_URL:**
(Get after first deployment from Vercel Dashboard)

---

**Run the commands above to set up your environment variables!** 🚀




