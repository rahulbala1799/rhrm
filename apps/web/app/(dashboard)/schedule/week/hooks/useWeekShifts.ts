'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, addDays } from 'date-fns'

export interface Shift {
  id: string
  staff_id: string
  location_id: string
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
}

export interface WeekShiftsResponse {
  shifts: Shift[]
  weekStart: string
  weekEnd: string
  conflicts?: Array<{
    shift_id: string
    type: string
    message: string
  }>
}

export function useWeekShifts(weekStart: Date, filters?: {
  locationId?: string
  staffId?: string
  status?: string
  includeCancelled?: boolean
}) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weekEnd, setWeekEnd] = useState<string>('')
  const [conflicts, setConflicts] = useState<Array<{
    shift_id: string
    type: string
    message: string
  }>>([])

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Format weekStart as YYYY-MM-DD
      const weekStartStr = format(weekStart, 'yyyy-MM-dd')

      const params = new URLSearchParams()
      params.append('weekStart', weekStartStr)
      
      if (filters?.locationId) params.append('locationId', filters.locationId)
      if (filters?.staffId) params.append('staffId', filters.staffId)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.includeCancelled) params.append('includeCancelled', 'true')

      const response = await fetch(`/api/schedule/week?${params}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch shifts')
      }

      const data: WeekShiftsResponse = await response.json()
      setShifts(data.shifts || [])
      setWeekEnd(data.weekEnd || '')
      setConflicts(data.conflicts || [])
    } catch (err: any) {
      console.error('Error fetching shifts:', err)
      setError(err.message || 'Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }, [weekStart, filters?.locationId, filters?.staffId, filters?.status, filters?.includeCancelled])

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  return {
    shifts,
    weekEnd,
    loading,
    error,
    conflicts,
    refetch: fetchShifts,
  }
}
