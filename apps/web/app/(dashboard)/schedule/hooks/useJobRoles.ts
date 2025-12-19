/**
 * Hook to fetch and cache job roles
 * Used for role name lookup in tooltips and roleExists validation
 */

'use client'

import useSWR from 'swr'
import { getRolesCacheKey } from '../hooks/useScheduleCache'
import { useTenantId } from './useTenantId'

interface JobRole {
  id: string
  name: string
  description: string | null
  bg_color: string
  text_color: string
  is_active: boolean
}

interface JobRolesResponse {
  roles: JobRole[]
}

async function fetcher(url: string): Promise<JobRolesResponse> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch job roles')
  }
  return response.json()
}

/**
 * Hook to get cached job roles
 * Returns a Map for O(1) lookup by role ID
 */
export function useJobRoles() {
  const tenantId = useTenantId()
  const cacheKey = tenantId ? getRolesCacheKey(tenantId) : null
  const url = tenantId ? '/api/settings/job-roles' : null

  const { data, error, isLoading } = useSWR<JobRolesResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Dedupe for 5 seconds
    }
  )

  // Build Map for O(1) lookup
  const jobRolesMap = new Map<string, { id: string; name: string }>()
  if (data?.roles) {
    data.roles.forEach(role => {
      if (role.is_active) {
        jobRolesMap.set(role.id, { id: role.id, name: role.name })
      }
    })
  }

  return {
    jobRolesMap,
    roles: data?.roles || [],
    loading: isLoading && !data,
    error: error?.message || null,
  }
}

