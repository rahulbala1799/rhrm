import { Shift } from '@/lib/schedule/types'
import { calculateShiftHours } from './budget-calculations'
import { startOfWeek, addWeeks, startOfMonth } from 'date-fns'
import { getCurrentPayPeriod, PayPeriodConfig } from '@/lib/pay-period/utils'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { getDayOfWeekInTimezone } from '@/lib/schedule/timezone-utils'

/**
 * Get pay cycle period start date based on pay frequency
 * @param currentDate - Current date (week start for planner)
 * @param payFrequency - 'weekly', 'fortnightly', or 'monthly'
 * @param payPeriodConfig - Pay period configuration from tenant settings
 * @param timezone - Tenant timezone
 * @returns Start date of the pay cycle period
 */
export function getPayCycleStart(
  currentDate: Date,
  payFrequency: 'weekly' | 'fortnightly' | 'monthly' | null,
  payPeriodConfig: PayPeriodConfig | null,
  timezone: string
): Date {
  if (!payFrequency) {
    // Default to weekly if not specified
    return startOfWeek(currentDate, { weekStartsOn: 1 })
  }

  switch (payFrequency) {
    case 'weekly': {
      const weekStartsOn = payPeriodConfig?.week_starts_on || 'monday'
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const startDayIndex = dayNames.indexOf(weekStartsOn.toLowerCase())
      const dateInTz = toZonedTime(currentDate, timezone)
      const dayOfWeek = dateInTz.getDay()
      let daysToSubtract = (dayOfWeek - startDayIndex + 7) % 7
      const startInTz = new Date(dateInTz)
      startInTz.setDate(startInTz.getDate() - daysToSubtract)
      startInTz.setHours(0, 0, 0, 0)
      return fromZonedTime(startInTz, timezone)
    }

    case 'fortnightly': {
      if (!payPeriodConfig?.first_period_start) {
        throw new Error(
          'Fortnightly pay period requires first_period_start. ' +
          'Overtime calculations must be skipped for this staff member.'
        )
      }
      const payPeriod = getCurrentPayPeriod(currentDate, payPeriodConfig, timezone)
      return payPeriod.start
    }

    case 'monthly': {
      const dateInTz = toZonedTime(currentDate, timezone)
      const year = dateInTz.getFullYear()
      const month = dateInTz.getMonth()
      const startInTz = new Date(year, month, 1, 0, 0, 0, 0)
      return fromZonedTime(startInTz, timezone)
    }

    default:
      // Fallback to weekly
      return startOfWeek(currentDate, { weekStartsOn: 1 })
  }
}

/**
 * Get pay cycle period end date
 * @param payCycleStart - Start date of pay cycle
 * @param payFrequency - 'weekly', 'fortnightly', or 'monthly'
 * @param timezone - Tenant timezone
 * @returns End date of the pay cycle period (exclusive)
 */
export function getPayCycleEnd(
  payCycleStart: Date,
  payFrequency: 'weekly' | 'fortnightly' | 'monthly' | null,
  timezone: string
): Date {
  if (!payFrequency) {
    // Default to weekly
    const startInTz = toZonedTime(payCycleStart, timezone)
    const endInTz = new Date(startInTz)
    endInTz.setDate(endInTz.getDate() + 7)
    return fromZonedTime(endInTz, timezone)
  }

  const startInTz = toZonedTime(payCycleStart, timezone)
  const endInTz = new Date(startInTz)

  switch (payFrequency) {
    case 'weekly':
      endInTz.setDate(endInTz.getDate() + 7)
      break
    case 'fortnightly':
      endInTz.setDate(endInTz.getDate() + 14)
      break
    case 'monthly':
      endInTz.setMonth(endInTz.getMonth() + 1)
      break
    default:
      endInTz.setDate(endInTz.getDate() + 7)
  }

  return fromZonedTime(endInTz, timezone)
}

/**
 * Calculate contracted hours threshold for pay cycle
 * @param contractedWeeklyHours - Weekly contracted hours
 * @param payFrequency - 'weekly', 'fortnightly', or 'monthly'
 * @returns Total contracted hours for the pay cycle period
 * 
 * ⚠️ V1 DECISION: Monthly threshold uses fixed multiplier of 4 (not average weeks)
 * Threshold = contracted_weekly_hours × 4 for monthly pay cycles
 * This avoids fractional thresholds and matches common payroll practice
 */
export function calculateContractedHoursThreshold(
  contractedWeeklyHours: number | null,
  payFrequency: 'weekly' | 'fortnightly' | 'monthly' | null
): number | null {
  if (contractedWeeklyHours === null || contractedWeeklyHours <= 0) {
    return null
  }

  if (!payFrequency) {
    return contractedWeeklyHours // Default to weekly
  }

  switch (payFrequency) {
    case 'weekly':
      return contractedWeeklyHours
    case 'fortnightly':
      return contractedWeeklyHours * 2
    case 'monthly':
      return contractedWeeklyHours * 4 // Fixed multiplier, not average
    default:
      return contractedWeeklyHours
  }
}

/**
 * Calculate cumulative hours for staff member within pay cycle
 * @param shifts - All shifts for staff member (must be sorted by start_time)
 * @param payCycleStart - Start of pay cycle period
 * @param payCycleEnd - End of pay cycle period (exclusive)
 * @param timezone - Tenant timezone
 * @returns Map of shift_id -> cumulative hours before that shift
 */
export function calculateCumulativeHours(
  shifts: Shift[],
  payCycleStart: Date,
  payCycleEnd: Date,
  timezone: string
): Map<string, number> {
  const cumulativeHours = new Map<string, number>()
  let runningTotal = 0

  for (const shift of shifts) {
    const shiftStart = new Date(shift.start_time)
    
    // Only include shifts within the pay cycle period
    if (shiftStart >= payCycleStart && shiftStart < payCycleEnd) {
      cumulativeHours.set(shift.id, runningTotal)
      const shiftHours = calculateShiftHours(
        shift.start_time,
        shift.end_time,
        shift.break_duration_minutes
      )
      runningTotal += shiftHours
    } else {
      // Shift outside pay cycle - still track cumulative for context
      cumulativeHours.set(shift.id, runningTotal)
    }
  }

  return cumulativeHours
}

/**
 * Calculate overtime rate based on rule type
 * @param hourlyRate - Base hourly rate
 * @param overtimeRuleType - 'multiplier' or 'flat_extra'
 * @param overtimeMultiplier - Multiplier value (if rule type is multiplier)
 * @param overtimeFlatExtra - Flat extra value (if rule type is flat_extra)
 * @returns Overtime rate per hour, or null if not configured
 */
export function calculateOvertimeRate(
  hourlyRate: number | null,
  overtimeRuleType: 'multiplier' | 'flat_extra' | null,
  overtimeMultiplier: number | null,
  overtimeFlatExtra: number | null
): number | null {
  if (!hourlyRate || hourlyRate <= 0) {
    return null
  }

  if (overtimeRuleType === 'multiplier' && overtimeMultiplier && overtimeMultiplier > 0) {
    return hourlyRate * overtimeMultiplier
  }

  if (overtimeRuleType === 'flat_extra' && overtimeFlatExtra !== null && overtimeFlatExtra >= 0) {
    return hourlyRate + overtimeFlatExtra
  }

  return null
}

/**
 * Calculate shift cost with overtime breakdown
 * @param shift - Shift to calculate
 * @param cumulativeHoursBeforeShift - Cumulative hours before this shift
 * @param contractedHoursThreshold - Total contracted hours for pay cycle
 * @param resolvedHourlyRate - Hourly rate resolved for this shift (from rate history)
 * @param overtimeEnabled - Whether overtime is enabled
 * @param overtimeRuleType - Overtime rule type
 * @param overtimeMultiplier - Overtime multiplier
 * @param overtimeFlatExtra - Overtime flat extra
 * @returns Cost breakdown with regular and overtime portions
 * 
 * ⚠️ IMPORTANT: resolvedHourlyRate MUST already reflect the correct rate for the shift
 * based on effective_date logic. This function must not resolve rates internally.
 * Rate resolution must be done in preprocessing step before calling this function.
 */
export function calculateShiftCostWithOvertime(
  shift: Shift,
  cumulativeHoursBeforeShift: number,
  contractedHoursThreshold: number | null,
  resolvedHourlyRate: number | null,
  overtimeEnabled: boolean | null,
  overtimeRuleType: 'multiplier' | 'flat_extra' | null,
  overtimeMultiplier: number | null,
  overtimeFlatExtra: number | null
): {
  regularHours: number
  overtimeHours: number
  regularCost: number
  overtimeCost: number
  totalCost: number
  hasOvertime: boolean
} {
  const shiftHours = calculateShiftHours(
    shift.start_time,
    shift.end_time,
    shift.break_duration_minutes
  )
  const cumulativeHoursAfterShift = cumulativeHoursBeforeShift + shiftHours

  // ⚠️ CRITICAL: Missing rate handling
  // If rate is missing, we cannot calculate costs - return 0 with indicator
  // UI should display "-" or "Rate missing" instead of $0.00 to avoid confusion
  // This is the ONLY case where totalCost can be 0 (rate truly missing)
  if (!resolvedHourlyRate || resolvedHourlyRate <= 0) {
    return {
      regularHours: shiftHours,
      overtimeHours: 0,
      regularCost: 0, // Rate missing - cannot calculate
      overtimeCost: 0,
      totalCost: 0, // Rate missing - cannot calculate
      hasOvertime: false
    }
  }

  // ⚠️ CRITICAL: Missing contracted hours or invalid overtime config
  // These cases skip overtime but STILL calculate regular cost normally
  // This prevents budget view totals from being incorrect
  if (!overtimeEnabled || !contractedHoursThreshold || cumulativeHoursAfterShift <= contractedHoursThreshold) {
    return {
      regularHours: shiftHours,
      overtimeHours: 0,
      regularCost: shiftHours * resolvedHourlyRate,
      overtimeCost: 0,
      totalCost: shiftHours * resolvedHourlyRate,
      hasOvertime: false
    }
  }

  // Calculate overtime rate
  const overtimeRate = calculateOvertimeRate(
    resolvedHourlyRate,
    overtimeRuleType,
    overtimeMultiplier,
    overtimeFlatExtra
  )

  // If overtime rate cannot be calculated, treat as regular hours only
  if (!overtimeRate) {
    return {
      regularHours: shiftHours,
      overtimeHours: 0,
      regularCost: shiftHours * resolvedHourlyRate,
      overtimeCost: 0,
      totalCost: shiftHours * resolvedHourlyRate,
      hasOvertime: false
    }
  }

  // Split hours between regular and overtime
  let regularHours = 0
  let overtimeHours = 0

  if (cumulativeHoursBeforeShift >= contractedHoursThreshold) {
    // All hours are overtime (threshold already exceeded)
    overtimeHours = shiftHours
  } else {
    // Split: some regular, some overtime
    regularHours = contractedHoursThreshold - cumulativeHoursBeforeShift
    overtimeHours = shiftHours - regularHours
  }

  // Option B: All hours at base rate + overtime extra
  // Regular cost: All hours at base rate
  const regularCost = shiftHours * resolvedHourlyRate
  
  // Overtime extra: Additional amount for overtime hours only
  let overtimeCost = 0
  if (overtimeRuleType === 'multiplier' && overtimeMultiplier) {
    // Multiplier: Extra = (multiplier × base_rate × overtime_hours) - (base_rate × overtime_hours)
    // Simplified: overtime_hours × base_rate × (multiplier - 1)
    // But user wants: multiplier × base_rate × overtime_hours as the extra
    overtimeCost = overtimeHours * resolvedHourlyRate * overtimeMultiplier
  } else if (overtimeRuleType === 'flat_extra' && overtimeFlatExtra !== null) {
    // Flat extra: Extra = flat_extra × overtime_hours
    overtimeCost = overtimeHours * overtimeFlatExtra
  }
  
  const totalCost = regularCost + overtimeCost

  return {
    regularHours,
    overtimeHours,
    regularCost,
    overtimeCost,
    totalCost,
    hasOvertime: overtimeHours > 0
  }
}

