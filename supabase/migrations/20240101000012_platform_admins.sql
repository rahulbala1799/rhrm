-- Platform admins table for superadmin allowlist
-- Superadmin identity is NOT membership-based - it's platform-level
-- This prevents "any admin" from accessing superadmin endpoints if a bug slips in

CREATE TABLE IF NOT EXISTS platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_platform_admins_user_id ON platform_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_status ON platform_admins(status) WHERE status = 'active';

-- RLS: Only platform admins can read this table
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Platform admins can read all
CREATE POLICY platform_admins_select_policy ON platform_admins
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM platform_admins pa
            WHERE pa.user_id = auth.uid()
                AND pa.status = 'active'
        )
    );

-- Only service role can insert/update/delete (via API routes)
-- No client-level policies for writes

-- Updated_at trigger
CREATE TRIGGER update_platform_admins_updated_at BEFORE UPDATE ON platform_admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

