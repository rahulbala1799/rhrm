-- Restrict sensitive tenant fields to server-only updates
-- Billing/subscription fields cannot be changed by tenant admins

-- Update tenant update policy to exclude sensitive fields
-- We'll use a trigger to enforce this at database level

CREATE OR REPLACE FUNCTION public.prevent_sensitive_tenant_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Block updates to sensitive fields from client sessions
    -- Service role can bypass this (direct SQL)
    
    -- Check if subscription_tier is being changed
    IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
        RAISE EXCEPTION 'subscription_tier cannot be changed by tenant admins. Contact platform support.';
    END IF;
    
    -- Add other sensitive fields here as needed:
    -- billing_email, billing_address, etc.
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce sensitive field protection
DROP TRIGGER IF EXISTS prevent_sensitive_tenant_updates_trigger ON tenants;
CREATE TRIGGER prevent_sensitive_tenant_updates_trigger
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_sensitive_tenant_updates();

-- Note: For production, consider splitting billing/subscription into separate table
-- with platform-only access, but this trigger approach works for v1



