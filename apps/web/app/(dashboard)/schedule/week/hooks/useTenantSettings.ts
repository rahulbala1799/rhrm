'use client'

import { useState, useEffect } from 'react'

export interface TenantSettings {
  timezone: string
  staff_can_accept_decline_shifts: boolean
}

export function useTenantSettings() {
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/schedule/settings')

        if (!response.ok) {
          // Default to UTC if settings don't exist
          setSettings({
            timezone: 'UTC',
            staff_can_accept_decline_shifts: false,
          })
          return
        }

        const data = await response.json()
        setSettings({
          timezone: data.timezone || 'UTC',
          staff_can_accept_decline_shifts: data.staff_can_accept_decline_shifts || false,
        })
      } catch (err: any) {
        console.error('Error fetching tenant settings:', err)
        setError(err.message)
        // Default to UTC on error
        setSettings({
          timezone: 'UTC',
          staff_can_accept_decline_shifts: false,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  return { settings, loading, error }
}


