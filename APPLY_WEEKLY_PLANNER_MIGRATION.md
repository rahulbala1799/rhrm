# Apply Weekly Planner Migration

The Supabase CLI is having issues with migration tracking. Here's how to apply the migration manually:

## Option 1: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Copy the entire contents of: `supabase/migrations/20251219000000_weekly_planner_system.sql`
5. Paste into SQL Editor
6. Click **Run**
7. Verify success - you should see:
   - Tables created: `tenant_settings`, `shift_audit_log`
   - Policies created
   - Indexes created

## Option 2: Mark Migration as Applied (If Already Run)

If you've already run the SQL manually, mark it as applied:

```sql
INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
VALUES ('20251219000000', 'weekly_planner_system', '')
ON CONFLICT (version) DO NOTHING;
```

## Verify Migration

After applying, verify in Supabase Dashboard:

1. **Tables**:
   - `tenant_settings` should exist
   - `shift_audit_log` should exist

2. **Check tenant_settings for existing tenants**:
   ```sql
   SELECT * FROM tenant_settings;
   ```
   Should have one row per tenant with default values.

3. **Check RLS policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename IN ('tenant_settings', 'shift_audit_log');
   ```

## Next Steps

After migration is applied:
1. Test API endpoints
2. Start UI implementation
3. Configure tenant timezones in settings

