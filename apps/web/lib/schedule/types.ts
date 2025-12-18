/**
 * Shared types for shift scheduling system
 * 
 * These types are used across daily and weekly views.
 * Import from this file, not from view-level hooks.
 */

export interface Shift {
  id: string
  staff_id: string
  location_id: string
  role_id?: string | null
  start_time: string
  end_time: string
  break_duration_minutes: number
  status: 'draft' | 'published' | 'confirmed' | 'cancelled'
  notes: string | null
  staff: {
    id: string
    first_name: string
    last_name: string
    preferred_name: string | null
    department: string | null
  } | null
  location: {
    id: string
    name: string
  } | null
  role?: {
    id: string
    name: string
    bg_color: string
    text_color: string
  } | null
}

export type ShiftStatus = 'draft' | 'published' | 'confirmed' | 'cancelled'

export type ShiftUpdateError = {
  code: 'OVERLAP' | 'FORBIDDEN' | 'VALIDATION' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'NETWORK' | 'UNKNOWN'
  message: string
  status?: number
  details?: any
}

