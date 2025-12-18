// 🚨 CANONICAL IMPLEMENTATION - Pay Period Calculation Utilities
// All pay period calculations use unified timezone pattern:
// 1. Convert input to tenant timezone
// 2. Calculate in tenant timezone
// 3. Convert back to UTC for storage/API

import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import { differenceInCalendarDays } from 'date-fns'

export interface PayPeriodConfig {
  type: 'weekly' | 'fortnightly' | 'semi-monthly' | 'monthly' | 'custom'
  week_starts_on?: string
  first_period_start?: string
  first_period_end?: number
  second_period_end?: 'last'
  monthly_starts_on?: number
}

export interface PayPeriod {
  start: Date  // UTC Date object
  end: Date    // UTC Date object
  periodNumber?: number
}

/**
 * Get current pay period for a given date
 */
export function getCurrentPayPeriod(
  date: Date,
  config: PayPeriodConfig,
  timezone: string = 'UTC'
): PayPeriod {
  switch (config.type) {
    case 'weekly':
      return getWeeklyPayPeriod(date, config.week_starts_on || 'monday', timezone)
    case 'fortnightly':
      return getFortnightlyPayPeriod(date, config.first_period_start, timezone)
    case 'semi-monthly':
      return getSemiMonthlyPayPeriod(date, config.first_period_end || 15, timezone)
    case 'monthly':
      return getMonthlyPayPeriod(date, config.monthly_starts_on || 1, timezone)
    default:
      throw new Error(`Unsupported pay period type: ${config.type}`)
  }
}

/**
 * Get pay period for a specific date (alias for getCurrentPayPeriod)
 */
export function getPayPeriodForDate(
  date: Date,
  config: PayPeriodConfig,
  timezone: string = 'UTC'
): PayPeriod {
  return getCurrentPayPeriod(date, config, timezone)
}

/**
 * Check if a date falls within a pay period
 */
export function isDateInPayPeriod(
  date: Date,
  payPeriod: PayPeriod,
  timezone: string = 'UTC'
): boolean {
  const dateInTz = utcToZonedTime(date, timezone)
  const startInTz = utcToZonedTime(payPeriod.start, timezone)
  const endInTz = utcToZonedTime(payPeriod.end, timezone)
  
  return dateInTz >= startInTz && dateInTz < endInTz
}

// CANONICAL: Weekly Pay Period
export function getWeeklyPayPeriod(
  date: Date,
  weekStartsOn: string,
  timezone: string
): PayPeriod {
  // 1. Convert input to tenant timezone
  const dateInTz = utcToZonedTime(date, timezone)
  
  // 2. Calculate in tenant timezone
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const startDayIndex = dayNames.indexOf(weekStartsOn.toLowerCase())
  const dayOfWeek = dateInTz.getDay()
  
  let daysToSubtract = (dayOfWeek - startDayIndex + 7) % 7
  
  const startInTz = new Date(dateInTz)
  startInTz.setDate(startInTz.getDate() - daysToSubtract)
  startInTz.setHours(0, 0, 0, 0)
  
  const endInTz = new Date(startInTz)
  endInTz.setDate(endInTz.getDate() + 7)
  
  // 3. Convert back to UTC for storage/API
  const start = zonedTimeToUtc(startInTz, timezone)
  const end = zonedTimeToUtc(endInTz, timezone)
  
  return { start, end }
}

// CANONICAL: Fortnightly Pay Period (DST-safe)
export function getFortnightlyPayPeriod(
  date: Date,
  firstPeriodStart: string | undefined,
  timezone: string
): PayPeriod {
  if (!firstPeriodStart) {
    throw new Error(
      'Fortnightly pay period requires a start date. ' +
      'Please configure "First period starts on" in pay settings.'
    )
  }
  
  // 1. Convert input to tenant timezone
  const dateInTz = utcToZonedTime(date, timezone)
  
  // 2. Convert reference date to tenant timezone (single conversion)
  const referenceDateUtc = new Date(firstPeriodStart + 'T00:00:00Z')
  const refInTz = utcToZonedTime(referenceDateUtc, timezone)
  
  // 3. Calculate using calendar days (DST-safe - avoids getTime() / 24h bug)
  const daysDiff = differenceInCalendarDays(dateInTz, refInTz)
  const fortnightsPassed = Math.floor(daysDiff / 14)
  
  const periodStartInTz = new Date(refInTz)
  periodStartInTz.setDate(periodStartInTz.getDate() + (fortnightsPassed * 14))
  periodStartInTz.setHours(0, 0, 0, 0)
  
  const periodEndInTz = new Date(periodStartInTz)
  periodEndInTz.setDate(periodEndInTz.getDate() + 14)
  
  // 4. Convert back to UTC
  const start = zonedTimeToUtc(periodStartInTz, timezone)
  const end = zonedTimeToUtc(periodEndInTz, timezone)
  
  return { start, end }
}

// CANONICAL: Semi-Monthly Pay Period
export function getSemiMonthlyPayPeriod(
  date: Date,
  firstPeriodEnd: number,
  timezone: string
): PayPeriod {
  // 1. Convert input to tenant timezone
  const dateInTz = utcToZonedTime(date, timezone)
  const year = dateInTz.getFullYear()
  const month = dateInTz.getMonth()
  const day = dateInTz.getDate()
  
  // 2. Calculate in tenant timezone
  let startInTz: Date
  let endInTz: Date
  
  if (day <= firstPeriodEnd) {
    startInTz = new Date(year, month, 1, 0, 0, 0, 0)
    endInTz = new Date(year, month, firstPeriodEnd + 1, 0, 0, 0, 0)
  } else {
    startInTz = new Date(year, month, firstPeriodEnd + 1, 0, 0, 0, 0)
    endInTz = new Date(year, month + 1, 1, 0, 0, 0, 0)
  }
  
  // 3. Convert back to UTC
  const start = zonedTimeToUtc(startInTz, timezone)
  const end = zonedTimeToUtc(endInTz, timezone)
  
  return { start, end }
}

// CANONICAL: Monthly Pay Period (with clamping)
export function getMonthlyPayPeriod(
  date: Date,
  monthlyStartsOn: number,
  timezone: string
): PayPeriod {
  // 1. Convert input to tenant timezone
  const dateInTz = utcToZonedTime(date, timezone)
  const year = dateInTz.getFullYear()
  const month = dateInTz.getMonth()
  
  // 2. Clamp start day to valid days in current month
  const daysInStartMonth = new Date(year, month + 1, 0).getDate()
  const actualStartDay = Math.min(monthlyStartsOn, daysInStartMonth)
  const startInTz = new Date(year, month, actualStartDay, 0, 0, 0, 0)
  
  // 3. Clamp end day to valid days in NEXT month
  const daysInEndMonth = new Date(year, month + 2, 0).getDate()
  const actualEndDay = Math.min(monthlyStartsOn, daysInEndMonth)
  const endInTz = new Date(year, month + 1, actualEndDay, 0, 0, 0, 0)
  
  // 4. Convert back to UTC
  const start = zonedTimeToUtc(startInTz, timezone)
  const end = zonedTimeToUtc(endInTz, timezone)
  
  return { start, end }
}

