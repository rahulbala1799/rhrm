/**
 * Role-based drag and drop validation utility
 * 
 * Single source of truth for role validation logic.
 * MUST be used by both daily and weekly schedulers.
 * No inline validation logic allowed in components.
 */

export interface CanDropShiftParams {
  shiftRoleId: string | null
  sourceStaffId: string
  targetStaffId: string
  targetStaffRoleIds: string[]
  roleExists?: boolean // Optional: true if role exists in job_roles, false if deleted/inactive
}

export interface CanDropShiftResult {
  allowed: boolean
  reason?: 'ROLE_MISMATCH' | 'NO_ROLES' | 'SAME_STAFF' | 'MISSING_ROLE'
}

/**
 * Validates if a shift can be dropped on a target staff member based on role restrictions.
 * 
 * Rules:
 * 1. If same staff → allowed true, reason SAME_STAFF
 * 2. If no shiftRoleId → allowed true
 * 3. If roleExists === false → allowed true, reason MISSING_ROLE
 * 4. If targetStaffRoleIds empty → allowed false, reason NO_ROLES
 * 5. Else allowed only if targetStaffRoleIds.includes(shiftRoleId) else ROLE_MISMATCH
 */
export function canDropShift(params: CanDropShiftParams): CanDropShiftResult {
  const { shiftRoleId, sourceStaffId, targetStaffId, targetStaffRoleIds, roleExists } = params
  
  // CRITICAL: Skip validation if staff_id hasn't changed
  if (sourceStaffId === targetStaffId) {
    return { allowed: true, reason: 'SAME_STAFF' }
  }
  
  // If shift has no role, allow drop
  if (!shiftRoleId) {
    return { allowed: true }
  }
  
  // If role was deleted/inactive, treat as "no role" but flag it
  if (roleExists === false) {
    return { allowed: true, reason: 'MISSING_ROLE' }
  }
  
  // If staff has no roles, block drop
  if (targetStaffRoleIds.length === 0) {
    return { allowed: false, reason: 'NO_ROLES' }
  }
  
  // Check if target staff has the shift's role
  const hasRole = targetStaffRoleIds.includes(shiftRoleId)
  return {
    allowed: hasRole,
    reason: hasRole ? undefined : 'ROLE_MISMATCH'
  }
}

