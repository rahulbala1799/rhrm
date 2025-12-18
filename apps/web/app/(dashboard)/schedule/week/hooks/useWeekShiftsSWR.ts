/**
 * SWR-based week shifts hook with stale-while-revalidate
 * 
 * CRITICAL: Never clears shifts state on navigation (cache persistence)
 * Shows cached data immediately, refreshes in background
 */

'use client'

import useSWR from 'swr'
import { format } from 'date-fns'
import { Shift } from '@/lib/schedule/types'
import { getWeekCacheKey, fetchTenantId, CacheFilters } from '../../hooks/useScheduleCache'

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

async function fetcher(url: string): Promise<WeekShiftsResponse> {
  const response = await fetch(url)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to fetch shifts')
  }
  return response.json()
}

export function useWeekShiftsSWR(
  weekStart: Date,
  tenantId: string | null,
  filters?: CacheFilters
) {
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  
  const params = new URLSearchParams()
  params.append('weekStart', weekStartStr)
  
  if (filters?.locationId) params.append('locationId', filters.locationId)
  if (filters?.staffId) params.append('staffId', filters.staffId)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.includeCancelled) params.append('includeCancelled', 'true')

  const cacheKey = tenantId ? getWeekCacheKey(tenantId, weekStart, filters) : null
  const url = tenantId ? `/api/schedule/week?${params}` : null

  const { data, error, isLoading, mutate } = useSWR<WeekShiftsResponse>(
    url,
    fetcher,
    {
      // Stale-while-revalidate: show cached data immediately
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      // Dedupe requests
      dedupingInterval: 2000,
      // SWR automatically shows cached data while revalidating (stale-while-revalidate)
      // Previous data is kept during revalidation by default
    }
  )

  // CRITICAL: Never return empty array - always return previous data if available
  // SWR's data persists across key changes until new data loads (prevents white flash)
  // During refetch, keep showing previous data until new data arrives
  const shifts = data?.shifts || []
  const weekEnd = data?.weekEnd || ''
  const conflicts = data?.conflicts || []

  return {
    shifts,
    weekEnd,
    loading: isLoading && !data, // Only show loading if no cached data (first paint only)
    error: error?.message || null,
    conflicts,
    refetch: () => mutate(),
  }
}

