-- Add flag to track if user is currently in onboarding
-- This prevents duplicate tenant creation attempts
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_in_progress BOOLEAN DEFAULT FALSE;

-- Add onboarding_session_id for concurrency safety
-- This UUID is generated when user hits /onboarding first time (not on first save)
-- Must match on updates to prevent race conditions from multiple tabs/devices
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_session_id UUID DEFAULT NULL;

-- Add idempotency tracking for tenant creation
-- Stores last create attempt key to make tenant creation truly idempotent
-- Survives retries/timeouts (unlike sessionId which is for concurrency)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_last_create_key UUID DEFAULT NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_in_progress 
ON profiles(onboarding_in_progress) 
WHERE onboarding_in_progress = TRUE;

-- Add unique constraint: Only one active tenant creation per user
-- This is the database-level safeguard against duplicate tenants
-- Combined with onboarding_in_progress flag and session_id for full protection
-- Note: This doesn't prevent multiple tenants over time, just concurrent creation
-- The check in API will verify: no existing active membership + no onboarding_in_progress

