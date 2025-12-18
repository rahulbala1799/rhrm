-- Function to auto-expire stale onboarding progress (30 days)
-- Called server-side only (worker/cron or API), never by clients
CREATE OR REPLACE FUNCTION cleanup_expired_onboarding()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles
    SET 
        onboarding_progress = NULL,
        onboarding_in_progress = FALSE,
        onboarding_expires_at = NULL,
        onboarding_session_id = NULL,
        onboarding_last_create_key = NULL
    WHERE 
        onboarding_expires_at IS NOT NULL
        AND onboarding_expires_at < NOW();
END;
$$;

-- DO NOT grant to authenticated users - security risk
-- Cleanup runs:
-- 1. Via worker/cron (service role), OR
-- 2. Inside onboarding API itself (server-side), OR
-- 3. As a normal query without SECURITY DEFINER
-- Clients never call cleanup RPC directly.




