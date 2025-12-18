// Staff Hourly Rate Utilities
// Batch rate fetching to avoid N+1 queries

import { SupabaseClient } from '@supabase/supabase-js'

export interface StaffRate {
  staff_id: string
  hourly_rate: number
  effective_date: string
}

/**
 * Find applicable rate for a given date from sorted rates array
 */
export function findRateForDate(
  rates: Array<{hourly_rate: number, effective_date: string}>,
  shiftDate: Date
): number | null {
  let applicableRate: number | null = null
  
  for (const rate of rates) {
    if (new Date(rate.effective_date) <= shiftDate) {
      applicableRate = rate.hourly_rate
    } else {
      break // Rates are sorted ascending, so we can stop
    }
  }
  
  return applicableRate
}

/**
 * Batch fetch rates for all staff in a date range
 * Single query to avoid N+1 performance issues
 */
export async function getRatesForStaffBatch(
  staffIds: string[],
  maxDate: Date,
  supabase: SupabaseClient
): Promise<Map<string, Array<{hourly_rate: number, effective_date: string}>>> {
  if (!staffIds || staffIds.length === 0) {
    return new Map()
  }

  const maxDateStr = maxDate.toISOString().split('T')[0]

  // Single query for all staff (not per-staff)
  const { data: allRates } = await supabase
    .from('staff_hourly_rates')
    .select('staff_id, hourly_rate, effective_date')
    .in('staff_id', staffIds)
    .lte('effective_date', maxDateStr)
    .order('staff_id', { ascending: true })
    .order('effective_date', { ascending: true })

  // Group rates by staff
  const ratesByStaff = new Map<string, Array<{hourly_rate: number, effective_date: string}>>()
  allRates?.forEach(rate => {
    if (!ratesByStaff.has(rate.staff_id)) {
      ratesByStaff.set(rate.staff_id, [])
    }
    ratesByStaff.get(rate.staff_id)!.push(rate)
  })

  return ratesByStaff
}

/**
 * Calculate shift costs using batch rate fetching
 */
export async function calculateShiftCostsBatch(
  shifts: Array<{staff_id: string, start_time: string, total_hours?: number | null}>,
  supabase: SupabaseClient
): Promise<Map<string, number | null>> {
  if (!shifts || shifts.length === 0) {
    return new Map()
  }

  // Get unique staff IDs and max date
  const staffIds = [...new Set(shifts.map(s => s.staff_id))]
  const maxDate = shifts.reduce((max, shift) => {
    const shiftDate = new Date(shift.start_time)
    return shiftDate > max ? shiftDate : max
  }, new Date(0))

  // Batch fetch all rates
  const ratesByStaff = await getRatesForStaffBatch(staffIds, maxDate, supabase)

  // Calculate costs
  const costs = new Map<string, number | null>()

  for (const shift of shifts) {
    const shiftDate = new Date(shift.start_time)
    const staffRates = ratesByStaff.get(shift.staff_id) || []
    const rate = findRateForDate(staffRates, shiftDate)
    
    const totalHours = shift.total_hours || 0
    const cost = rate !== null ? totalHours * rate : null
    
    costs.set(shift.staff_id, cost)
  }

  return costs
}

