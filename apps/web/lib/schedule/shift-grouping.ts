import { Shift } from '@/app/(dashboard)/schedule/week/hooks/useWeekShifts'
import {
  getDayOfWeekInTimezone,
  isOvernight,
  getOvernightContinuationDay,
} from './timezone-utils'

// Re-export for convenience
export { isOvernight, getOvernightContinuationDay, getDayOfWeekInTimezone } from './timezone-utils'

/**
 * Group shifts by staff_id and day index (0-6, Monday-Sunday)
 * Returns: Map<staffId, Map<dayIndex, Shift[]>>
 */
export function groupShiftsByStaffAndDay(
  shifts: Shift[],
  timezone: string,
  weekStart: Date
): Map<string, Map<number, Shift[]>> {
  const grouped = new Map<string, Map<number, Shift[]>>()
  
  for (const shift of shifts) {
    // Skip cancelled shifts (they're filtered by backend if includeCancelled=false)
    if (shift.status === 'cancelled') {
      continue
    }
    
    const staffId = shift.staff_id
    
    // Get day index for start time (0=Monday, 6=Sunday)
    const dayIndex = getDayOfWeekInTimezone(shift.start_time, timezone)
    
    // Initialize staff map if needed
    if (!grouped.has(staffId)) {
      grouped.set(staffId, new Map())
    }
    
    const staffMap = grouped.get(staffId)!
    
    // Initialize day array if needed
    if (!staffMap.has(dayIndex)) {
      staffMap.set(dayIndex, [])
    }
    
    // Add shift to day array
    staffMap.get(dayIndex)!.push(shift)
    
    // Handle overnight shifts - add ghost continuation
    if (isOvernight(shift, timezone)) {
      const continuationDay = getOvernightContinuationDay(shift, timezone)
      if (continuationDay !== null && continuationDay !== dayIndex) {
        // Add ghost continuation (same shift, different day)
        if (!staffMap.has(continuationDay)) {
          staffMap.set(continuationDay, [])
        }
        // Note: We don't actually add the shift again - ghost blocks are render-only
        // This is just for tracking which days need ghost blocks
      }
    }
  }
  
  // Sort shifts within each day by start time (ascending)
  for (const staffMap of grouped.values()) {
    for (const shifts of staffMap.values()) {
      shifts.sort((a, b) => {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      })
    }
  }
  
  return grouped
}

/**
 * Get shifts for a specific staff and day
 */
export function getShiftsForStaffAndDay(
  grouped: Map<string, Map<number, Shift[]>>,
  staffId: string,
  dayIndex: number
): Shift[] {
  return grouped.get(staffId)?.get(dayIndex) || []
}

/**
 * Check if shift needs ghost continuation on a specific day
 */
export function needsGhostContinuation(
  shift: Shift,
  dayIndex: number,
  timezone: string
): boolean {
  if (!isOvernight({ start_time: shift.start_time, end_time: shift.end_time }, timezone)) {
    return false
  }
  
  const startDay = getDayOfWeekInTimezone(shift.start_time, timezone)
  const endDay = getOvernightContinuationDay(
    { start_time: shift.start_time, end_time: shift.end_time },
    timezone
  )
  
  // Ghost appears on end day (if different from start day)
  return endDay !== null && endDay === dayIndex && endDay !== startDay
}

