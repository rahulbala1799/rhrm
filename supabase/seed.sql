-- Seed data for development/testing
-- Run with: supabase db reset (applies migrations + seed)

-- Insert a test tenant
INSERT INTO tenants (id, name, slug, subscription_tier, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Acme Retail Ltd',
    'acme-retail',
    'pro',
    '{"timezone": "Europe/London"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Note: User profiles and memberships should be created via auth flow
-- This seed file is for reference only - actual users come from Supabase Auth

-- Example: After creating a user via auth, you would manually create membership:
-- INSERT INTO memberships (tenant_id, user_id, role, status, joined_at)
-- VALUES (
--     '00000000-0000-0000-0000-000000000001',
--     '<user-id-from-auth>',
--     'admin',
--     'active',
--     NOW()
-- );




