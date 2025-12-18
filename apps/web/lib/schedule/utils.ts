import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'

export interface TenantSettings {
  timezone: string
  staff_can_accept_decline_shifts: boolean
}

/**
 * Get tenant settings (timezone and staff accept/decline setting)
 */
export async function getTenantSettings(): Promise<TenantSettings | null> {
  const { tenantId } = await getTenantContext()
  
  if (!tenantId) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('timezone, staff_can_accept_decline_shifts')
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    // Default to UTC if settings don't exist
    return {
      timezone: 'UTC',
      staff_can_accept_decline_shifts: false,
    }
  }

  return {
    timezone: data.timezone || 'UTC',
    staff_can_accept_decline_shifts: data.staff_can_accept_decline_shifts || false,
  }
}

/**
 * Convert a date string (YYYY-MM-DD) to Monday 00:00:00 in tenant timezone, then to UTC
 */
export async function getWeekStartUTC(weekStartDate: string): Promise<Date> {
  const settings = await getTenantSettings()
  const timezone = settings?.timezone || 'UTC'

  // Parse the date string (YYYY-MM-DD)
  const [year, month, day] = weekStartDate.split('-').map(Number)
  
  // Create date in tenant timezone (Monday 00:00:00)
  // Using a library would be better, but for now we'll use a simple approach
  // This is a simplified version - in production, use a proper timezone library like date-fns-tz
  const localDate = new Date(year, month - 1, day, 0, 0, 0, 0)
  
  // For now, return the date as-is. In production, use proper timezone conversion
  // This requires a library like date-fns-tz or moment-timezone
  return localDate
}

/**
 * Get week end date (Sunday) in tenant timezone
 */
export async function getWeekEndDate(weekStartDate: string): Promise<string> {
  const [year, month, day] = weekStartDate.split('-').map(Number)
  const startDate = new Date(year, month - 1, day)
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6) // Add 6 days to get Sunday
  
  const yearEnd = endDate.getFullYear()
  const monthEnd = String(endDate.getMonth() + 1).padStart(2, '0')
  const dayEnd = String(endDate.getDate()).padStart(2, '0')
  
  return `${yearEnd}-${monthEnd}-${dayEnd}`
}

/**
 * Convert UTC timestamp to tenant timezone date string
 */
export async function utcToTenantDate(utcDate: Date): Promise<string> {
  const settings = await getTenantSettings()
  const timezone = settings?.timezone || 'UTC'
  
  // Simplified - in production use proper timezone library
  const year = utcDate.getUTCFullYear()
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utcDate.getUTCDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Check if shift has started/ended in tenant timezone
 */
export async function isShiftStartedOrEnded(shiftStartTime: string, shiftEndTime: string): Promise<boolean> {
  const settings = await getTenantSettings()
  const timezone = settings?.timezone || 'UTC'
  
  const now = new Date()
  const start = new Date(shiftStartTime)
  const end = new Date(shiftEndTime)
  
  // Check if current time is after shift start or end
  return now >= start || now >= end
}

/**
 * Create audit log entry for shift changes
 */
export async function createShiftAuditLog(params: {
  shiftId: string | null
  actionType: 'created' | 'updated' | 'deleted' | 'published' | 'unpublished' | 'confirmed' | 'cancelled' | 'reassigned' | 'time_changed' | 'location_changed' | 'break_changed' | 'notes_changed'
  beforeSnapshot: any | null
  afterSnapshot: any | null
  message: string
  isPostStartEdit?: boolean
}): Promise<void> {
  const { tenantId } = await getTenantContext()
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!tenantId || !user) {
    throw new Error('Missing tenant context or user')
  }

  // Use service role for audit log insertion (bypasses RLS)
  // In production, you'd use a service role client here
  // For now, we'll use the regular client and let RLS handle it
  // Note: RLS policy should allow system inserts, but we need service role for immutable audit logs
  
  const { error } = await supabase
    .from('shift_audit_log')
    .insert({
      tenant_id: tenantId,
      shift_id: params.shiftId,
      action_type: params.actionType,
      is_post_start_edit: params.isPostStartEdit || false,
      before_snapshot: params.beforeSnapshot,
      after_snapshot: params.afterSnapshot,
      message: params.message,
      changed_by: user.id,
    })

  if (error) {
    console.error('Error creating audit log:', error)
    // Don't throw - audit logging failure shouldn't break the operation
  }
}

