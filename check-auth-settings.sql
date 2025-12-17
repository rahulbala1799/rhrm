-- Check current auth settings
-- Run this in your Supabase SQL Editor to see if email confirmation is enabled

SELECT 
    name,
    value
FROM auth.config
WHERE name IN ('enable_signup', 'enable_confirmations', 'double_confirm_changes')
ORDER BY name;

-- If you don't see 'enable_confirmations', it means it might be controlled via dashboard settings

