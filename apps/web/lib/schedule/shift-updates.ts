/**
 * Shared utilities for shift mutations and timezone conversions
 * 
 * These utilities are used by both daily and weekly views.
 * All shift mutations (update/create/delete) must go through these functions.
 */

import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { Shift, ShiftUpdateError } from './types'

/**
 * Parse error response from shift API and return standardized ShiftUpdateError
 * 
 * Maps HTTP status codes to error codes:
 * - 409 → OVERLAP
 * - 403 → FORBIDDEN
 * - 400 → VALIDATION
 * - 401 → UNAUTHORIZED
 * - 404 → NOT_FOUND
 * - network/fetch failure → NETWORK
 * - default → UNKNOWN
 */
export function parseShiftUpdateError(response: Response, errorData?: any): ShiftUpdateError {
  if (!response.ok) {
    switch (response.status) {
      case 409:
        return {
          code: 'OVERLAP',
          message: errorData?.error || 'Shift overlaps with another shift',
          status: 409,
          details: errorData?.conflict,
        }
      case 403:
        return {
          code: 'FORBIDDEN',
          message: errorData?.error || 'Not allowed: you don\'t have permission.',
          status: 403,
        }
      case 400:
        return {
          code: 'VALIDATION',
          message: errorData?.error || 'Invalid input',
          status: 400,
          details: errorData,
        }
      case 401:
        return {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
          status: 401,
        }
      case 404:
        return {
          code: 'NOT_FOUND',
          message: errorData?.error || 'Shift not found',
          status: 404,
        }
      case 500:
        return {
          code: 'UNKNOWN',
          message: errorData?.error || 'Server error',
          status: 500,
        }
      default:
        return {
          code: 'UNKNOWN',
          message: errorData?.error || 'Unknown error',
          status: response.status,
        }
    }
  }
  throw new Error('parseShiftUpdateError called on successful response')
}

/**
 * Update an existing shift
 * 
 * Calls PUT /api/schedule/shifts/${shiftId}
 * On non-ok: parse JSON (safe), throw ShiftUpdateError
 */
export async function updateShiftViaAPI(
  shiftId: string,
  updates: Partial<Shift>
): Promise<Shift> {
  try {
    const response = await fetch(`/api/schedule/shifts/${shiftId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw parseShiftUpdateError(response, errorData)
    }

    const updatedShift: Shift = await response.json()
    return updatedShift
  } catch (err) {
    // Handle network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw {
        code: 'NETWORK' as const,
        message: 'Network error, try again',
      } as ShiftUpdateError
    }
    // Re-throw ShiftUpdateError
    if (err && typeof err === 'object' && 'code' in err) {
      throw err
    }
    // Unknown error
    throw {
      code: 'UNKNOWN' as const,
      message: err instanceof Error ? err.message : 'Unknown error',
    } as ShiftUpdateError
  }
}

/**
 * Create a new shift
 * 
 * Calls POST /api/schedule/shifts
 * On non-ok: throw ShiftUpdateError
 */
export async function createShiftViaAPI(payload: Partial<Shift>): Promise<Shift> {
  try {
    const response = await fetch('/api/schedule/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw parseShiftUpdateError(response, errorData)
    }

    const createdShift: Shift = await response.json()
    return createdShift
  } catch (err) {
    // Handle network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw {
        code: 'NETWORK' as const,
        message: 'Network error, try again',
      } as ShiftUpdateError
    }
    // Re-throw ShiftUpdateError
    if (err && typeof err === 'object' && 'code' in err) {
      throw err
    }
    // Unknown error
    throw {
      code: 'UNKNOWN' as const,
      message: err instanceof Error ? err.message : 'Unknown error',
    } as ShiftUpdateError
  }
}

/**
 * Delete a shift
 * 
 * Calls DELETE /api/schedule/shifts/${shiftId}
 * On non-ok: throw ShiftUpdateError
 */
export async function deleteShiftViaAPI(shiftId: string): Promise<void> {
  try {
    const response = await fetch(`/api/schedule/shifts/${shiftId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw parseShiftUpdateError(response, errorData)
    }
  } catch (err) {
    // Handle network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw {
        code: 'NETWORK' as const,
        message: 'Network error, try again',
      } as ShiftUpdateError
    }
    // Re-throw ShiftUpdateError
    if (err && typeof err === 'object' && 'code' in err) {
      throw err
    }
    // Unknown error
    throw {
      code: 'UNKNOWN' as const,
      message: err instanceof Error ? err.message : 'Unknown error',
    } as ShiftUpdateError
  }
}

/**
 * Convert a Date object (interpreted as wall-clock time in tenant timezone) to UTC ISO string
 * 
 * JavaScript Date objects have no timezone - they represent a moment in time.
 * This helper interprets the Date as "wall-clock time" in the provided timezone,
 * then converts it to UTC for API storage.
 * 
 * Handles DST correctly using date-fns-tz.
 * 
 * @param date - Date object representing wall-clock time in tenant timezone
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns ISO string in UTC
 */
export function toUtcIsoInTenantTz(date: Date, timezone: string): string {
  // date is interpreted as wall-clock time in tenant timezone, convert to UTC
  return fromZonedTime(date, timezone).toISOString()
}

/**
 * Convert a UTC ISO string to a Date object (interpreted as wall-clock time in tenant timezone)
 * 
 * Converts UTC timestamp to tenant timezone for display/editing.
 * 
 * Handles DST correctly using date-fns-tz.
 * 
 * @param isoString - ISO string in UTC
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns Date object representing wall-clock time in tenant timezone
 */
export function fromUtcIsoToTenantTz(isoString: string, timezone: string): Date {
  // isoString is UTC, convert to tenant timezone wall-clock time
  return toZonedTime(new Date(isoString), timezone)
}

