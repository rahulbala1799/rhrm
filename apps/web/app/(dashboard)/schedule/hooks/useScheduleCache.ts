/**
 * Schedule cache utilities for SWR
 * 
 * Provides cache key generation and invalidation helpers
 * following the stale-while-revalidate pattern.
 */

import { format } from 'date-fns'

export interface CacheFilters {
  locationId?: string
  staffId?: string
  status?: string
  includeCancelled?: boolean
}

/**
 * Generate cache key for weekly schedule data
 */
export function getWeekCacheKey(
  tenantId: string,
  weekStart: Date,
  filters?: CacheFilters
): string[] {
  const weekStartISO = format(weekStart, 'yyyy-MM-dd')
  const key: string[] = ['schedule', 'week', tenantId, weekStartISO]
  
  if (filters?.locationId) key.push(`loc:${filters.locationId}`)
  if (filters?.staffId) key.push(`staff:${filters.staffId}`)
  if (filters?.status) key.push(`status:${filters.status}`)
  if (filters?.includeCancelled) key.push('cancelled:true')
  
  return key
}

/**
 * Generate cache key for daily schedule data
 */
export function getDayCacheKey(
  tenantId: string,
  date: Date,
  filters?: CacheFilters
): string[] {
  const dateISO = format(date, 'yyyy-MM-dd')
  const key: string[] = ['schedule', 'day', tenantId, dateISO]
  
  if (filters?.locationId) key.push(`loc:${filters.locationId}`)
  if (filters?.staffId) key.push(`staff:${filters.staffId}`)
  if (filters?.status) key.push(`status:${filters.status}`)
  if (filters?.includeCancelled) key.push('cancelled:true')
  
  return key
}

/**
 * Generate cache key for staff list
 */
export function getStaffCacheKey(tenantId: string): string[] {
  return ['staff', tenantId]
}

/**
 * Generate cache key for locations
 */
export function getLocationsCacheKey(tenantId: string): string[] {
  return ['locations', tenantId]
}

/**
 * Generate cache key for roles
 */
export function getRolesCacheKey(tenantId: string): string[] {
  return ['roles', tenantId]
}

/**
 * Get tenant ID from API
 * This is a client-side helper that fetches tenant ID from /api/me/tenant
 */
export async function fetchTenantId(): Promise<string | null> {
  try {
    const response = await fetch('/api/me/tenant')
    if (!response.ok) return null
    const data = await response.json()
    return data.tenant?.id || null
  } catch {
    return null
  }
}

