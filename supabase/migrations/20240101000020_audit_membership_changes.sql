-- Enhanced audit logging for membership changes
-- Logs ownership transfers, role changes, deletions, invitation acceptance

-- Update audit trigger for memberships to include more context
CREATE OR REPLACE FUNCTION public.audit_memberships_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB;
    v_is_owner BOOLEAN;
    v_tenant_owner_id UUID;
BEGIN
    -- Get tenant owner for context
    SELECT owner_user_id INTO v_tenant_owner_id
    FROM tenants
    WHERE id = COALESCE(NEW.tenant_id, OLD.tenant_id);
    
    v_is_owner := (COALESCE(NEW.user_id, OLD.user_id) = v_tenant_owner_id);

    IF TG_OP = 'INSERT' THEN
        v_changes := jsonb_build_object(
            'new', row_to_json(NEW),
            'is_owner', v_is_owner,
            'created_via', 'invitation' -- All inserts should be via invitations
        );
        PERFORM public.create_audit_log(
            'create',
            'membership',
            NEW.id,
            NEW.tenant_id,
            v_changes
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_changes := jsonb_build_object(
            'old', row_to_json(OLD),
            'new', row_to_json(NEW),
            'is_owner', v_is_owner
        );
        
        -- Special handling for role changes (privilege escalation risk)
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            v_changes := v_changes || jsonb_build_object(
                'role_change', true,
                'old_role', OLD.role,
                'new_role', NEW.role
            );
        END IF;
        
        -- Special handling for status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changes := v_changes || jsonb_build_object(
                'status_change', true,
                'old_status', OLD.status,
                'new_status', NEW.status
            );
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
        v_changes := jsonb_build_object(
            'old', row_to_json(OLD),
            'is_owner', v_is_owner
        );
        PERFORM public.create_audit_log(
            'delete',
            'membership',
            OLD.id,
            OLD.tenant_id,
            v_changes
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists, just updated the function

-- Add trigger for tenant ownership changes (via service role)
CREATE OR REPLACE FUNCTION public.audit_tenant_ownership_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB;
BEGIN
    IF OLD.owner_user_id IS DISTINCT FROM NEW.owner_user_id THEN
        v_changes := jsonb_build_object(
            'old_owner_id', OLD.owner_user_id,
            'new_owner_id', NEW.owner_user_id,
            'ownership_transfer', true
        );
        
        PERFORM public.create_audit_log(
            'update',
            'tenant',
            NEW.id,
            NEW.id,
            v_changes
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_tenant_ownership_changes_trigger
    AFTER UPDATE ON tenants
    FOR EACH ROW
    WHEN (OLD.owner_user_id IS DISTINCT FROM NEW.owner_user_id)
    EXECUTE FUNCTION public.audit_tenant_ownership_changes();


