import { Shift } from '../hooks/useWeekShifts'

/**
 * Validate hourly rate value
 * @param rate - Hourly rate value (can be any type)
 * @returns Validated hourly rate number or null if invalid
 */
export function validateHourlyRate(rate: unknown): number | null {
  if (rate === null || rate === undefined) return null
  const num = Number(rate)
  if (isNaN(num) || num < 0) return null
  return num
}

/**
 * Calculate total hours for a shift (accounting for breaks)
 * @param startTime - Shift start timestamp
 * @param endTime - Shift end timestamp
 * @param breakMinutes - Break duration in minutes
 * @returns Total billable hours
 */
export function calculateShiftHours(
  startTime: string,
  endTime: string,
  breakMinutes: number
): number {
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  
  if (isNaN(start) || isNaN(end) || end <= start) {
    return 0
  }
  
  // Calculate total milliseconds
  const totalMs = end - start
  
  // Convert to hours
  const totalHours = totalMs / (1000 * 60 * 60)
  
  // Subtract break time (convert minutes to hours)
  const breakHours = breakMinutes / 60
  
  // Return billable hours (minimum 0)
  return Math.max(0, totalHours - breakHours)
}

/**
 * Calculate shift cost from hours and hourly rate
 * @param startTime - Shift start timestamp
 * @param endTime - Shift end timestamp
 * @param breakMinutes - Break duration in minutes
 * @param hourlyRate - Staff hourly rate (can be null)
 * @returns Calculated cost or null if rate missing
 */
export function calculateShiftCost(
  startTime: string,
  endTime: string,
  breakMinutes: number,
  hourlyRate: number | null
): number | null {
  const validatedRate = validateHourlyRate(hourlyRate)
  if (validatedRate === null) {
    return null
  }
  
  const hours = calculateShiftHours(startTime, endTime, breakMinutes)
  return hours * validatedRate
}

/**
 * Calculate row total (sum of all shift costs for a staff member)
 * @param shifts - Array of shifts for the staff member
 * @param staffHourlyRate - Staff hourly rate
 * @returns Total cost for the row
 */
export function calculateRowTotal(
  shifts: Shift[],
  staffHourlyRate: number | null
): number {
  if (!shifts || shifts.length === 0) {
    return 0
  }
  
  const validatedRate = validateHourlyRate(staffHourlyRate)
  if (validatedRate === null) {
    return 0
  }
  
  return shifts.reduce((total, shift) => {
    const cost = calculateShiftCost(
      shift.start_time,
      shift.end_time,
      shift.break_duration_minutes,
      validatedRate
    )
    return total + (cost || 0)
  }, 0)
}

/**
 * Calculate column total (sum of all shift costs for a day)
 * @param dayShifts - Array of shifts for the day
 * @param staffHourlyRates - Map of staff_id -> hourly_rate
 * @returns Total cost for the column
 */
export function calculateColumnTotal(
  dayShifts: Shift[],
  staffHourlyRates: Map<string, number | null>
): number {
  if (!dayShifts || dayShifts.length === 0) {
    return 0
  }
  
  return dayShifts.reduce((total, shift) => {
    const hourlyRate = staffHourlyRates.get(shift.staff_id) ?? null
    const cost = calculateShiftCost(
      shift.start_time,
      shift.end_time,
      shift.break_duration_minutes,
      hourlyRate
    )
    return total + (cost || 0)
  }, 0)
}

/**
 * Calculate grand total (sum of all shift costs for the week)
 * @param shifts - All shifts for the week
 * @param staffHourlyRates - Map of staff_id -> hourly_rate
 * @returns Grand total cost
 */
export function calculateGrandTotal(
  shifts: Shift[],
  staffHourlyRates: Map<string, number | null>
): number {
  if (!shifts || shifts.length === 0) {
    return 0
  }
  
  return shifts.reduce((total, shift) => {
    const hourlyRate = staffHourlyRates.get(shift.staff_id) ?? null
    const cost = calculateShiftCost(
      shift.start_time,
      shift.end_time,
      shift.break_duration_minutes,
      hourlyRate
    )
    return total + (cost || 0)
  }, 0)
}

