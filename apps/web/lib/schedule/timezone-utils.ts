import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz'
import { addDays, startOfDay, format as formatDate } from 'date-fns'

/**
 * Convert UTC timestamp to tenant timezone Date
 */
export function toTenantTimezone(utcTimestamp: string, timezone: string): Date {
  return toZonedTime(new Date(utcTimestamp), timezone)
}

/**
 * Convert tenant timezone Date to UTC timestamp string
 */
export function fromTenantTimezone(localDate: Date, timezone: string): string {
  return fromZonedTime(localDate, timezone).toISOString()
}

/**
 * Get week start (Monday 00:00) in tenant timezone, then convert to UTC
 */
export function getWeekStartInTimezone(weekStartDate: Date, timezone: string): Date {
  // weekStartDate is already Monday in tenant timezone (YYYY-MM-DD format interpreted as local)
  // Create Monday 00:00:00 in tenant timezone
  const year = weekStartDate.getFullYear()
  const month = weekStartDate.getMonth()
  const day = weekStartDate.getDate()
  
  // Create date at midnight in tenant timezone
  const localMidnight = new Date(year, month, day, 0, 0, 0, 0)
  
  // Convert to UTC using timezone library
  return fromZonedTime(localMidnight, timezone)
}

/**
 * Get week end (next Monday 00:00 exclusive) in tenant timezone, then convert to UTC
 */
export function getWeekEndExclusiveInTimezone(weekStartDate: Date, timezone: string): Date {
  // Add 7 days to get next Monday
  const nextMonday = addDays(weekStartDate, 7)
  return getWeekStartInTimezone(nextMonday, timezone)
}

/**
 * Format time in tenant timezone
 */
export function formatTimeInTimezone(
  timestamp: string,
  timezone: string,
  formatStr: string = 'HH:mm'
): string {
  const zonedDate = toZonedTime(new Date(timestamp), timezone)
  return formatTz(zonedDate, formatStr, { timeZone: timezone })
}

/**
 * Get day of week (0-6, Monday-Sunday) in tenant timezone
 */
export function getDayOfWeekInTimezone(timestamp: string, timezone: string): number {
  const zonedDate = toZonedTime(new Date(timestamp), timezone)
  // date-fns getDay returns 0=Sunday, 1=Monday, etc.
  // We need 0=Monday, 1=Tuesday, etc.
  const day = zonedDate.getDay()
  return day === 0 ? 6 : day - 1 // Convert Sunday (0) to 6, others shift by 1
}

/**
 * Apply HH:mm to target date in tenant timezone, handling DST edge cases
 * Returns UTC timestamp string
 */
export function applyTimeToDate(
  targetDate: Date, // Date in tenant timezone (YYYY-MM-DD interpreted as local)
  hours: number,
  minutes: number,
  timezone: string
): string {
  const year = targetDate.getFullYear()
  const month = targetDate.getMonth()
  const day = targetDate.getDate()
  
  // Create date with time in tenant timezone
  const localDateTime = new Date(year, month, day, hours, minutes, 0, 0)
  
  // Handle DST edge cases
  // If local time is invalid (spring forward gap): move forward to next valid minute
  // If local time is ambiguous (fall back overlap): pick the earlier occurrence
  // date-fns-tz handles this automatically via zonedTimeToUtc
  
  // Convert to UTC
  return fromZonedTime(localDateTime, timezone).toISOString()
}

/**
 * Check if shift crosses midnight in tenant timezone
 */
export function isOvernight(shift: { start_time: string; end_time: string }, timezone: string): boolean {
  const startLocal = toZonedTime(new Date(shift.start_time), timezone)
  const endLocal = toZonedTime(new Date(shift.end_time), timezone)
  
  // Check if end day is different from start day
  return startLocal.getDate() !== endLocal.getDate() ||
         startLocal.getMonth() !== endLocal.getMonth() ||
         startLocal.getFullYear() !== endLocal.getFullYear()
}

/**
 * Get continuation day index (0-6) for overnight shift, or null if not overnight
 */
export function getOvernightContinuationDay(
  shift: { start_time: string; end_time: string },
  timezone: string
): number | null {
  if (!isOvernight(shift, timezone)) {
    return null
  }
  
  const endLocal = toZonedTime(new Date(shift.end_time), timezone)
  return getDayOfWeekInTimezone(shift.end_time, timezone)
}

