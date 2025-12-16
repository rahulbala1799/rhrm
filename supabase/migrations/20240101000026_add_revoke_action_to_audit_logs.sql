-- Add 'revoke' action to audit_logs check constraint
-- This allows tracking invitation revocations and other revoke actions

-- Drop the existing check constraint
ALTER TABLE audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_action_check;

-- Recreate with 'revoke' action included
ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_action_check 
CHECK (action IN ('create', 'update', 'delete', 'view', 'export', 'revoke'));

-- Add comment
COMMENT ON CONSTRAINT audit_logs_action_check ON audit_logs IS 
'Allowed actions: create, update, delete, view, export, revoke. Revoke is used for invitation revocations and similar operations.';

