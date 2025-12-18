-- Audit logging for invitations (created, revoked, expired)
-- Tracks all invitation lifecycle events

CREATE OR REPLACE FUNCTION public.audit_invitations_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB;
    v_action TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
        v_changes := jsonb_build_object(
            'new', row_to_json(NEW),
            'invited_email', NEW.email,
            'invited_role', NEW.role,
            'invited_by', NEW.invited_by,
            'expires_at', NEW.expires_at
        );
        
        PERFORM public.create_audit_log(
            v_action,
            'invitation',
            NEW.id,
            NEW.tenant_id,
            v_changes
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_changes := jsonb_build_object(
            'old', row_to_json(OLD),
            'new', row_to_json(NEW)
        );
        
        -- Special handling for status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changes := v_changes || jsonb_build_object(
                'status_change', true,
                'old_status', OLD.status,
                'new_status', NEW.status
            );
            
            -- Track specific status transitions
            IF NEW.status = 'revoked' AND OLD.status != 'revoked' THEN
                v_changes := v_changes || jsonb_build_object('revoked', true);
            ELSIF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
                v_changes := v_changes || jsonb_build_object(
                    'accepted', true,
                    'accepted_at', NEW.accepted_at
                );
            ELSIF NEW.status = 'expired' AND OLD.status != 'expired' THEN
                v_changes := v_changes || jsonb_build_object('expired', true);
            END IF;
        END IF;
        
        -- Determine action type
        IF OLD.status != 'revoked' AND NEW.status = 'revoked' THEN
            v_action := 'revoke';
        ELSE
            v_action := 'update';
        END IF;
        
        PERFORM public.create_audit_log(
            v_action,
            'invitation',
            NEW.id,
            NEW.tenant_id,
            v_changes
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_changes := jsonb_build_object(
            'old', row_to_json(OLD),
            'invited_email', OLD.email,
            'invited_role', OLD.role
        );
        
        PERFORM public.create_audit_log(
            'delete',
            'invitation',
            OLD.id,
            OLD.tenant_id,
            v_changes
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invitations
DROP TRIGGER IF EXISTS audit_invitations_changes_trigger ON invitations;
CREATE TRIGGER audit_invitations_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_invitations_changes();

-- Add comment
COMMENT ON FUNCTION public.audit_invitations_changes IS 
'Audits all invitation lifecycle events: creation, status changes (accepted/revoked/expired), and deletions.';




