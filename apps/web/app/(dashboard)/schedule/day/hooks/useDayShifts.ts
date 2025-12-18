'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Shift } from '@/lib/schedule/types'

export interface DayShiftsResponse {
  date: string
  shifts: Shift[]
  conflicts?: Array<{
    shift_id: string
    type: string
    message: string
  }>
  totals?: {
    totalShifts: number
    totalStaff: number
    totalHours: number
    totalCost: number
    overtimeCost: number
  }
}

export function useDayShifts(date: Date, filters?: {
  locationId?: string
  staffId?: string
  status?: string
  includeCancelled?: boolean
}) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<Array<{
    shift_id: string
    type: string
    message: string
  }>>([])
  const [totals, setTotals] = useState<DayShiftsResponse['totals']>({
    totalShifts: 0,
    totalStaff: 0,
    totalHours: 0,
    totalCost: 0,
    overtimeCost: 0,
  })

  const fetchShifts = useCallback(async (isRefetch = false) => {
    try {
      if (!isRefetch) {
        setLoading(true)
      }
      setError(null)

      // Format date as YYYY-MM-DD
      const dateStr = format(date, 'yyyy-MM-dd')

      const params = new URLSearchParams()
      params.append('date', dateStr)
      
      if (filters?.locationId) params.append('locationId', filters.locationId)
      if (filters?.staffId) params.append('staffId', filters.staffId)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.includeCancelled) params.append('includeCancelled', 'true')

      const response = await fetch(`/api/schedule/day?${params}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch shifts')
      }

      const data: DayShiftsResponse = await response.json()
      setShifts(data.shifts || [])
      setConflicts(data.conflicts || [])
      setTotals(data.totals || {
        totalShifts: 0,
        totalStaff: 0,
        totalHours: 0,
        totalCost: 0,
        overtimeCost: 0,
      })
    } catch (err: any) {
      console.error('Error fetching shifts:', err)
      setError(err.message || 'Failed to load shifts')
    } finally {
      if (!isRefetch) {
        setLoading(false)
      }
    }
  }, [date, filters?.locationId, filters?.staffId, filters?.status, filters?.includeCancelled])

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  return {
    shifts,
    loading,
    error,
    conflicts,
    totals,
    refetch: () => fetchShifts(true),
  }
}

