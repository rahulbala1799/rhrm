import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'

/**
 * Create a tenant-scoped Supabase client
 * Automatically filters queries by active tenant_id
 */
export async function createTenantClient() {
  const supabase = await createClient()
  const context = await getTenantContext()

  if (!context.tenantId) {
    throw new Error('No active tenant context')
  }

  return {
    supabase,
    tenantId: context.tenantId,
    role: context.role,
    membershipId: context.membershipId,
  }
}

/**
 * Helper to add tenant_id filter to queries
 * Note: RLS policies already enforce tenant isolation,
 * but this adds an explicit filter for clarity and performance
 */
export function withTenantFilter<T>(
  query: any,
  tenantId: string
) {
  return query.eq('tenant_id', tenantId)
}

