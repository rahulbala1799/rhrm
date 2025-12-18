/**
 * SWR-based day shifts hook with stale-while-revalidate
 * 
 * CRITICAL: Never clears shifts state on navigation (cache persistence)
 * Shows cached data immediately, refreshes in background
 */

'use client'

import useSWR from 'swr'
import { format } from 'date-fns'
import { Shift } from '@/lib/schedule/types'
import { getDayCacheKey, fetchTenantId, CacheFilters } from '../../hooks/useScheduleCache'

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

async function fetcher(url: string): Promise<DayShiftsResponse> {
  const response = await fetch(url)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to fetch shifts')
  }
  return response.json()
}

export function useDayShiftsSWR(
  date: Date,
  tenantId: string | null,
  filters?: CacheFilters
) {
  const dateStr = format(date, 'yyyy-MM-dd')
  
  const params = new URLSearchParams()
  params.append('date', dateStr)
  
  if (filters?.locationId) params.append('locationId', filters.locationId)
  if (filters?.staffId) params.append('staffId', filters.staffId)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.includeCancelled) params.append('includeCancelled', 'true')

  const cacheKey = tenantId ? getDayCacheKey(tenantId, date, filters) : null
  const url = tenantId ? `/api/schedule/day?${params}` : null

  const { data, error, isLoading, mutate } = useSWR<DayShiftsResponse>(
    url,
    fetcher,
    {
      // Stale-while-revalidate: show cached data immediately
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      // Dedupe requests
      dedupingInterval: 2000,
      // SWR automatically shows cached data while revalidating (stale-while-revalidate)
    }
  )

  // CRITICAL: Never return empty array - always return previous data if available
  // SWR's data persists across key changes until new data loads (prevents white flash)
  const shifts = data?.shifts || []
  const conflicts = data?.conflicts || []
  const totals = data?.totals || {
    totalShifts: 0,
    totalStaff: 0,
    totalHours: 0,
    totalCost: 0,
    overtimeCost: 0,
  }

  return {
    shifts,
    loading: isLoading && !data, // Only show loading if no cached data (first paint only)
    error: error?.message || null,
    conflicts,
    totals,
    refetch: () => mutate(),
  }
}

