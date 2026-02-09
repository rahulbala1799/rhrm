// Overtime calculation for pay run lines — see PAY_RUNS_DESIGN.md

export interface StaffOvertimeConfig {
  contracted_weekly_hours: number | null
  overtime_enabled: boolean
  overtime_rule_type: 'multiplier' | 'flat_extra' | null
  overtime_multiplier: number | null
  overtime_flat_extra: number | null
}

export interface OvertimeResult {
  regularHours: number
  overtimeHours: number
  overtimeRate: number
}

/**
 * Split total hours into regular and overtime, and compute overtime rate.
 * Used when generating pay run lines.
 */
export function calculateOvertimeForLine(
  totalHours: number,
  staff: StaffOvertimeConfig,
  baseRate: number
): OvertimeResult {
  if (!staff.overtime_enabled || staff.contracted_weekly_hours == null || staff.contracted_weekly_hours <= 0) {
    return {
      regularHours: totalHours,
      overtimeHours: 0,
      overtimeRate: 0,
    }
  }

  const regularHours = Math.min(totalHours, staff.contracted_weekly_hours)
  const overtimeHours = Math.max(0, totalHours - staff.contracted_weekly_hours)

  let overtimeRate = baseRate
  if (staff.overtime_rule_type === 'multiplier' && staff.overtime_multiplier != null) {
    overtimeRate = baseRate * staff.overtime_multiplier
  } else if (staff.overtime_rule_type === 'flat_extra' && staff.overtime_flat_extra != null) {
    overtimeRate = baseRate + staff.overtime_flat_extra
  }

  return { regularHours, overtimeHours, overtimeRate }
}
