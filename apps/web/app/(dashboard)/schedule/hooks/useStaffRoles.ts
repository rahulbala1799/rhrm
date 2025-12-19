/**
 * Hook to fetch and cache staff roles
 * Hybrid approach: prefetch visible staff, fetch on-demand for others
 */

'use client'

import { useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { useTenantId } from './useTenantId'

interface StaffRole {
  staffId: string
  roleIds: string[]
}

interface StaffRolesResponse {
  roles: Array<{ id: string; name: string }>
}

/**
 * Fetch roles for a single staff member
 */
async function fetchStaffRoles(staffId: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/staff/${staffId}/roles`)
    if (!response.ok) {
      return []
    }
    const { roles } = await response.json()
    return (roles || []).map((r: { id: string }) => r.id)
  } catch (error) {
    console.error(`Error fetching roles for staff ${staffId}:`, error)
    return []
  }
}

/**
 * Bulk fetch roles for multiple staff members
 * Falls back to individual fetches if bulk endpoint doesn't exist
 */
async function fetchBulkStaffRoles(staffIds: string[]): Promise<Map<string, string[]>> {
  const rolesMap = new Map<string, string[]>()
  
  // Try bulk endpoint first (if it exists)
  try {
    const response = await fetch(`/api/staff/roles/bulk?staffIds=${staffIds.join(',')}`)
    if (response.ok) {
      const data = await response.json()
      // Expected format: { staffRoles: [{ staffId, roleIds: [...] }] }
      if (data.staffRoles) {
        data.staffRoles.forEach((sr: { staffId: string; roleIds: string[] }) => {
          rolesMap.set(sr.staffId, sr.roleIds || [])
        })
        return rolesMap
      }
    }
  } catch {
    // Bulk endpoint doesn't exist, fall through to individual fetches
  }
  
  // Fallback: fetch individually (parallel)
  const promises = staffIds.map(async (staffId) => {
    const roleIds = await fetchStaffRoles(staffId)
    return { staffId, roleIds }
  })
  
  const results = await Promise.all(promises)
  results.forEach(({ staffId, roleIds }) => {
    rolesMap.set(staffId, roleIds)
  })
  
  return rolesMap
}

/**
 * Hook to get staff roles with caching
 * 
 * @param staffIds - Array of staff IDs to fetch roles for
 * @returns Map of staffId -> roleIds[] and helper functions
 */
export function useStaffRoles(staffIds: string[]) {
  const tenantId = useTenantId()
  
  // Create a stable key for SWR (sorted staff IDs)
  const sortedStaffIds = useMemo(() => [...staffIds].sort(), [staffIds])
  const cacheKey = tenantId && sortedStaffIds.length > 0
    ? ['staff-roles', tenantId, ...sortedStaffIds]
    : null

  const { data, error, isLoading, mutate } = useSWR<Map<string, string[]>>(
    cacheKey,
    async () => {
      if (sortedStaffIds.length === 0) return new Map()
      return fetchBulkStaffRoles(sortedStaffIds)
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      // Keep data in cache even when staffIds change
      keepPreviousData: true,
    }
  )

  const staffRolesMap = data || new Map<string, string[]>()
  
  /**
   * Ensure roles for a specific staff member are loaded
   * Fetches on-demand if not in cache
   */
  const ensureRolesForStaff = useCallback(async (staffId: string): Promise<string[]> => {
    // If already in map, return it
    if (staffRolesMap.has(staffId)) {
      return staffRolesMap.get(staffId) || []
    }
    
    // Fetch on-demand
    const roleIds = await fetchStaffRoles(staffId)
    
    // Update the map (this will trigger a re-render)
    const newMap = new Map(staffRolesMap)
    newMap.set(staffId, roleIds)
    mutate(newMap, false) // false = don't revalidate
    
    return roleIds
  }, [staffRolesMap, mutate])

  return {
    staffRolesMap,
    loading: isLoading && !data,
    error: error?.message || null,
    ensureRolesForStaff,
    refetch: () => mutate(),
  }
}

