import { getActiveTenantId } from '../supabase/client'
import { verifyTenantAccess } from '../supabase/client'

/**
 * Tenant context for offline behavior
 * 
 * Rules:
 * - If no network, use cached activeTenantId but block writes until membership verification succeeds
 * - Prevents "offline writes to wrong tenant" edge cases
 * - Read operations can use cached tenant context
 * - Write operations require network + membership verification
 */

export interface OfflineTenantContext {
  tenantId: string | null
  isVerified: boolean
  canWrite: boolean
}

/**
 * Get tenant context with offline support
 * Returns cached tenantId if offline, but marks as unverified
 */
export async function getOfflineTenantContext(): Promise<OfflineTenantContext> {
  const cachedTenantId = await getActiveTenantId()
  
  if (!cachedTenantId) {
    return {
      tenantId: null,
      isVerified: false,
      canWrite: false,
    }
  }

  // Try to verify membership (requires network)
  try {
    const hasAccess = await verifyTenantAccess(cachedTenantId)
    
    return {
      tenantId: cachedTenantId,
      isVerified: hasAccess,
      canWrite: hasAccess, // Can only write if verified
    }
  } catch (error) {
    // Network error - use cached but block writes
    return {
      tenantId: cachedTenantId,
      isVerified: false,
      canWrite: false, // Block writes when offline/unverified
    }
  }
}

/**
 * Check if write operation is allowed
 * Requires network + membership verification
 */
export async function canPerformWrite(): Promise<boolean> {
  const context = await getOfflineTenantContext()
  
  if (!context.tenantId) {
    return false
  }

  // Must be verified (requires network)
  return context.isVerified && context.canWrite
}

