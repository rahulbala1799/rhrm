import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface TenantContext {
  tenantId: string | null
  role: string | null
  membershipId: string | null
}

/**
 * Get user's active tenant context from memberships table
 * This replaces JWT claims - we look up membership directly
 */
export async function getTenantContext(): Promise<TenantContext> {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { tenantId: null, role: null, membershipId: null }
  }

  // Get active tenant from cookie (UI state)
  const cookieStore = await cookies()
  const activeTenantId = cookieStore.get('active_tenant_id')?.value

  if (!activeTenantId) {
    // Try to get first active membership (maybeSingle: no error when 0 rows)
    const { data: membership } = await supabase
      .from('memberships')
      .select('tenant_id, role, id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (membership) {
      return {
        tenantId: membership.tenant_id,
        role: membership.role,
        membershipId: membership.id,
      }
    }

    return { tenantId: null, role: null, membershipId: null }
  }

  // Verify user has active membership in this tenant
  const { data: membership } = await supabase
    .from('memberships')
    .select('tenant_id, role, id')
    .eq('user_id', user.id)
    .eq('tenant_id', activeTenantId)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) {
    // Invalid tenant - clear cookie and return null
    cookieStore.delete('active_tenant_id')
    return { tenantId: null, role: null, membershipId: null }
  }

  return {
    tenantId: membership.tenant_id,
    role: membership.role,
    membershipId: membership.id,
  }
}

/**
 * Get all tenants user has access to
 */
export async function getUserTenants() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: memberships } = await supabase
    .from('memberships')
    .select('tenant_id, role, id, tenants(id, name, slug)')
    .eq('user_id', user.id)
    .eq('status', 'active')

  return memberships || []
}

/**
 * Verify user has required role in tenant (server-side validation)
 */
export async function verifyTenantAccess(
  tenantId: string,
  requiredRole: 'admin' | 'manager' | 'staff' = 'staff'
): Promise<boolean> {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single()

  if (!membership) {
    return false
  }

  // Role hierarchy check
  const roleHierarchy: Record<string, number> = {
    staff: 1,
    manager: 2,
    admin: 3,
    superadmin: 4,
  }

  const userRoleLevel = roleHierarchy[membership.role] || 0
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0

  return userRoleLevel >= requiredRoleLevel
}

