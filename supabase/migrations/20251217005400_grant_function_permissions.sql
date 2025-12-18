-- Grant execute permission on helper functions to anonymous users
-- This is needed for invitation acceptance flow where unauthenticated users
-- need to query invitations table which joins with tenants table

-- Grant execute on user_has_membership to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.user_has_membership(UUID, UUID) TO anon, authenticated;

-- Grant execute on user_has_role_in_tenant to anon and authenticated roles  
GRANT EXECUTE ON FUNCTION public.user_has_role_in_tenant(UUID, UUID, TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.user_has_membership IS 
'Check if user has active membership in tenant. Granted to anon for invitation queries.';

COMMENT ON FUNCTION public.user_has_role_in_tenant IS 
'Check if user has specific role in tenant. Granted to anon for invitation queries.';




