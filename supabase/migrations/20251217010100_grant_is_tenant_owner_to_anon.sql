-- Grant execute permission on is_tenant_owner to anonymous users
-- This is needed because the tenants table policies might reference this function
-- and anonymous users need to query tenants for invitation display

GRANT EXECUTE ON FUNCTION public.is_tenant_owner(UUID, UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.is_tenant_owner IS 
'Check if user is tenant owner. Granted to anon for invitation queries that join with tenants table.';




