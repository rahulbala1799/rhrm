-- Audit logging triggers for critical tables
-- All CREATE, UPDATE, DELETE operations are logged with actor metadata

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION public.create_audit_log(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID,
    p_tenant_id UUID,
    p_changes JSONB DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get current user ID (NULL for system actions)
    v_user_id := auth.uid();
    
    -- Insert audit log entry
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        changes,
        ip_address,
        user_agent
    )
    VALUES (
        p_tenant_id,
        v_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_changes,
        NULL, -- IP address captured at application level
        NULL  -- User agent captured at application level
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for staff table
CREATE OR REPLACE FUNCTION public.audit_staff_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.create_audit_log(
            'create',
            'staff',
            NEW.id,
            NEW.tenant_id,
            jsonb_build_object('new', row_to_json(NEW))
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_changes := jsonb_build_object(
            'old', row_to_json(OLD),
            'new', row_to_json(NEW)
        );
        PERFORM public.create_audit_log(
            'update',
            'staff',
            NEW.id,
            NEW.tenant_id,
            v_changes
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.create_audit_log(
            'delete',
            'staff',
            OLD.id,
            OLD.tenant_id,
            jsonb_build_object('old', row_to_json(OLD))
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for shifts table
CREATE OR REPLACE FUNCTION public.audit_shifts_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.create_audit_log(
            'create',
            'shift',
            NEW.id,
            NEW.tenant_id,
            jsonb_build_object('new', row_to_json(NEW))
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_changes := jsonb_build_object(
            'old', row_to_json(OLD),
            'new', row_to_json(NEW)
        );
        PERFORM public.create_audit_log(
            'update',
            'shift',
            NEW.id,
            NEW.tenant_id,
            v_changes
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.create_audit_log(
            'delete',
            'shift',
            OLD.id,
            OLD.tenant_id,
            jsonb_build_object('old', row_to_json(OLD))
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for timesheets table
CREATE OR REPLACE FUNCTION public.audit_timesheets_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.create_audit_log(
            'create',
            'timesheet',
            NEW.id,
            NEW.tenant_id,
            jsonb_build_object('new', row_to_json(NEW))
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_changes := jsonb_build_object(
            'old', row_to_json(OLD),
            'new', row_to_json(NEW)
        );
        PERFORM public.create_audit_log(
            'update',
            'timesheet',
            NEW.id,
            NEW.tenant_id,
            v_changes
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.create_audit_log(
            'delete',
            'timesheet',
            OLD.id,
            OLD.tenant_id,
            jsonb_build_object('old', row_to_json(OLD))
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for memberships table (critical for security)
CREATE OR REPLACE FUNCTION public.audit_memberships_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.create_audit_log(
            'create',
            'membership',
            NEW.id,
            NEW.tenant_id,
            jsonb_build_object('new', row_to_json(NEW))
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_changes := jsonb_build_object(
            'old', row_to_json(OLD),
            'new', row_to_json(NEW)
        );
        -- Special handling for role changes (privilege escalation risk)
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            v_changes := v_changes || jsonb_build_object('role_change', true);
        END IF;
        PERFORM public.create_audit_log(
            'update',
            'membership',
            NEW.id,
            NEW.tenant_id,
            v_changes
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.create_audit_log(
            'delete',
            'membership',
            OLD.id,
            OLD.tenant_id,
            jsonb_build_object('old', row_to_json(OLD))
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS audit_staff_changes_trigger ON staff;
CREATE TRIGGER audit_staff_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON staff
    FOR EACH ROW EXECUTE FUNCTION public.audit_staff_changes();

DROP TRIGGER IF EXISTS audit_shifts_changes_trigger ON shifts;
CREATE TRIGGER audit_shifts_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON shifts
    FOR EACH ROW EXECUTE FUNCTION public.audit_shifts_changes();

DROP TRIGGER IF EXISTS audit_timesheets_changes_trigger ON timesheets;
CREATE TRIGGER audit_timesheets_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON timesheets
    FOR EACH ROW EXECUTE FUNCTION public.audit_timesheets_changes();

DROP TRIGGER IF EXISTS audit_memberships_changes_trigger ON memberships;
CREATE TRIGGER audit_memberships_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON memberships
    FOR EACH ROW EXECUTE FUNCTION public.audit_memberships_changes();

