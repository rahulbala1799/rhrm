/**
 * Prefetch utilities for schedule navigation
 * 
 * Implements idle-time prefetching of next/previous week/day
 * with cancellation support to avoid wasted work.
 */

import { addDays, subDays, addWeeks, subWeeks } from 'date-fns'
import { mutate } from 'swr'
import { getWeekCacheKey, getDayCacheKey, fetchTenantId, CacheFilters } from './useScheduleCache'

let prefetchAbortController: AbortController | null = null
let prefetchTimeoutId: NodeJS.Timeout | null = null

/**
 * Cancel any pending prefetch operations
 */
export function cancelPrefetch(): void {
  if (prefetchAbortController) {
    prefetchAbortController.abort()
    prefetchAbortController = null
  }
  if (prefetchTimeoutId) {
    clearTimeout(prefetchTimeoutId)
    prefetchTimeoutId = null
  }
}

/**
 * Prefetch next and previous week on idle
 */
export async function prefetchAdjacentWeeks(
  currentWeekStart: Date,
  tenantId: string,
  filters?: CacheFilters,
  onPrefetch?: (weekStart: Date) => Promise<any>
): Promise<void> {
  cancelPrefetch()
  
  const nextWeek = addWeeks(currentWeekStart, 1)
  const prevWeek = subWeeks(currentWeekStart, 1)
  
  // Use requestIdleCallback if available, otherwise setTimeout
  const schedulePrefetch = (callback: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 2000 })
    } else {
      prefetchTimeoutId = setTimeout(callback, 1000)
    }
  }
  
  schedulePrefetch(() => {
    if (prefetchAbortController?.signal.aborted) return
    
    prefetchAbortController = new AbortController()
    
    // Prefetch next week
    const nextKey = getWeekCacheKey(tenantId, nextWeek, filters)
    if (onPrefetch) {
      onPrefetch(nextWeek).catch(() => {
        // Silently fail - prefetch is best effort
      })
    } else {
      mutate(nextKey, undefined, { revalidate: false })
    }
    
    // Prefetch previous week
    const prevKey = getWeekCacheKey(tenantId, prevWeek, filters)
    if (onPrefetch) {
      onPrefetch(prevWeek).catch(() => {
        // Silently fail - prefetch is best effort
      })
    } else {
      mutate(prevKey, undefined, { revalidate: false })
    }
  })
}

/**
 * Prefetch next and previous day on idle
 */
export async function prefetchAdjacentDays(
  currentDate: Date,
  tenantId: string,
  filters?: CacheFilters,
  onPrefetch?: (date: Date) => Promise<any>
): Promise<void> {
  cancelPrefetch()
  
  const nextDay = addDays(currentDate, 1)
  const prevDay = subDays(currentDate, 1)
  
  // Use requestIdleCallback if available, otherwise setTimeout
  const schedulePrefetch = (callback: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 2000 })
    } else {
      prefetchTimeoutId = setTimeout(callback, 1000)
    }
  }
  
  schedulePrefetch(() => {
    if (prefetchAbortController?.signal.aborted) return
    
    prefetchAbortController = new AbortController()
    
    // Prefetch next day
    const nextKey = getDayCacheKey(tenantId, nextDay, filters)
    if (onPrefetch) {
      onPrefetch(nextDay).catch(() => {
        // Silently fail - prefetch is best effort
      })
    } else {
      mutate(nextKey, undefined, { revalidate: false })
    }
    
    // Prefetch previous day
    const prevKey = getDayCacheKey(tenantId, prevDay, filters)
    if (onPrefetch) {
      onPrefetch(prevDay).catch(() => {
        // Silently fail - prefetch is best effort
      })
    } else {
      mutate(prevKey, undefined, { revalidate: false })
    }
  })
}

