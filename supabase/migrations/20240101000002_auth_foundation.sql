-- Authentication foundation: profiles trigger and membership-based RLS helpers

-- Function to automatically create profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function: Check if user has active membership in a tenant
-- This is the core of membership-based RLS
-- SECURITY DEFINER with restricted search_path for safety
CREATE OR REPLACE FUNCTION public.user_has_membership(
    user_uuid UUID,
    tenant_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM memberships
        WHERE user_id = user_uuid
            AND tenant_id = tenant_uuid
            AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Helper function: Get user's role in a specific tenant
CREATE OR REPLACE FUNCTION public.get_user_role_in_tenant(
    user_uuid UUID,
    tenant_uuid UUID
)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM memberships
    WHERE user_id = user_uuid
        AND tenant_id = tenant_uuid
        AND status = 'active'
    LIMIT 1;
    
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Helper function: Check if user has required role (or higher) in tenant
-- Role hierarchy: superadmin > admin > manager > staff
CREATE OR REPLACE FUNCTION public.user_has_role_in_tenant(
    user_uuid UUID,
    tenant_uuid UUID,
    required_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM memberships
    WHERE user_id = user_uuid
        AND tenant_id = tenant_uuid
        AND status = 'active'
    LIMIT 1;
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Role hierarchy check
    CASE required_role
        WHEN 'superadmin' THEN
            RETURN user_role = 'superadmin';
        WHEN 'admin' THEN
            RETURN user_role IN ('superadmin', 'admin');
        WHEN 'manager' THEN
            RETURN user_role IN ('superadmin', 'admin', 'manager');
        WHEN 'staff' THEN
            RETURN user_role IN ('superadmin', 'admin', 'manager', 'staff');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Helper function: Check if user is staff member (for own-record checks)
CREATE OR REPLACE FUNCTION public.user_is_staff_member(
    user_uuid UUID,
    staff_record_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM staff s
        WHERE s.id = staff_record_id
            AND s.user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Grant execute permissions on helper functions
-- Authenticated users need execute for RLS policies to work
-- Anon users are explicitly denied
GRANT EXECUTE ON FUNCTION public.user_has_membership TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_in_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role_in_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_staff_member TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_has_membership FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_role_in_tenant FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_has_role_in_tenant FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_is_staff_member FROM anon, public;

-- Note: Service role can execute regardless (bypasses RLS)
-- But these functions are designed for authenticated user sessions

-- Enable RLS on profiles and memberships (policies will be added in next migration)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

