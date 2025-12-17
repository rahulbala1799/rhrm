-- Add staff onboarding completion tracking to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS staff_onboarding_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS staff_onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_staff_onboarding_completed 
ON profiles(staff_onboarding_completed) 
WHERE staff_onboarding_completed = TRUE;

-- Comment
COMMENT ON COLUMN profiles.staff_onboarding_completed IS 'Tracks if staff member has completed their onboarding flow after accepting an invitation';
COMMENT ON COLUMN profiles.staff_onboarding_completed_at IS 'Timestamp when staff onboarding was completed';


