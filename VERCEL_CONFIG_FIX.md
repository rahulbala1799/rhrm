# Vercel Configuration Fix

## Issue Fixed

The `vercel.json` file had an invalid property `rootDirectory`. This property should be configured in the Vercel Dashboard, not in `vercel.json`.

## Solution

Removed `rootDirectory` from `vercel.json`. The root directory must be set in:
- **Vercel Dashboard → Project Settings → General → Root Directory**

Set it to: `apps/web`

## Updated vercel.json

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

## Environment Variables Status

✅ **Set:**
- `NEXT_PUBLIC_SUPABASE_URL` (Production)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production)
- `SUPABASE_SERVICE_ROLE_KEY` (Production)

⚠️ **Recommended:**
- Add public variables to **all environments** (Production, Preview, Development)
- Add `NEXT_PUBLIC_APP_URL` after first deployment

## Next Steps

1. **Set Root Directory in Vercel Dashboard:**
   - Go to Project Settings → General
   - Set Root Directory: `apps/web`

2. **Add environment variables to all environments:**
   ```bash
   cd apps/web
   vercel env add NEXT_PUBLIC_SUPABASE_URL preview
   vercel env add NEXT_PUBLIC_SUPABASE_URL development
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```




