-- Add onboarding_progress JSONB field to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT NULL;

-- Add expires_at for auto-cleanup of stale onboarding data
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_progress 
ON profiles USING GIN (onboarding_progress);

-- Add index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_expires_at 
ON profiles(onboarding_expires_at) 
WHERE onboarding_expires_at IS NOT NULL;

-- Structure:
-- {
--   "version": 1,  // Schema version for future-proofing
--   "currentStep": 3,
--   "completedSteps": [1, 2],
--   "data": {
--     "ownerConfirmed": true,
--     "businessName": "...",
--     "businessType": "...",
--     ...
--   },
--   "idempotencyKey": "uuid",  // For retry-safe tenant creation
--   "startedAt": "2024-01-01T00:00:00Z",
--   "lastUpdatedAt": "2024-01-01T00:00:00Z"
-- }

-- CRITICAL: Onboarding progress privacy enforcement
-- RLS doesn't do column-level security - multiple SELECT policies are OR'd together.
-- So profiles_select_policy_all would still expose onboarding_progress to same-tenant members.
-- 
-- Rule: onboarding_progress is only ever read/written via self-only API routes and self-only queries.
-- Tenant-wide profile queries must NEVER request onboarding_progress.
--
-- Enforcement:
-- 1. All API routes that read onboarding_progress MUST use WHERE id = auth.uid()
-- 2. All client queries that read profiles for tenant members MUST exclude onboarding_progress
--    (e.g., SELECT id, email, full_name, ... FROM profiles WHERE ...)
-- 3. Never use SELECT * FROM profiles in tenant-wide queries
--
-- Future improvement: Move to separate table onboarding_progress(user_id PK, ...) 
-- with RLS policy user_id = auth.uid() for true column-level isolation.
--
-- For UPDATE: Only owner can update their own onboarding_progress
-- (Already covered by profiles_update_policy_own)




