/**
 * Hook to get tenant ID from API
 * Used for cache key generation
 */

'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

async function fetcher(url: string) {
  const response = await fetch(url)
  if (!response.ok) return null
  const data = await response.json()
  return data.tenant?.id || null
}

export function useTenantId(): string | null {
  const { data: tenantId } = useSWR<string | null>('/api/me/tenant', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  })
  
  return tenantId || null
}

