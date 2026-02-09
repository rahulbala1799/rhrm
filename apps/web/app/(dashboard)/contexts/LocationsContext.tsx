'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface LocationRecord {
  id: string
  name: string
  address?: string | null
  postcode?: string | null
  phone?: string | null
  settings?: unknown
  created_at?: string
  updated_at?: string
}

interface LocationsContextType {
  locations: LocationRecord[]
  refetch: () => Promise<void>
}

const LocationsContext = createContext<LocationsContextType>({
  locations: [],
  refetch: async () => {},
})

interface LocationsProviderProps {
  children: ReactNode
  /** Initial locations from layout gate (fetched before children render). */
  initialLocations?: LocationRecord[]
}

export function LocationsProvider({ children, initialLocations = [] }: LocationsProviderProps) {
  const [locations, setLocations] = useState<LocationRecord[]>(initialLocations)

  const refetch = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/locations')
      if (!response.ok) return
      const data = await response.json()
      setLocations(data.locations || [])
    } catch (err) {
      console.error('Error fetching locations:', err)
    }
  }, [])

  return (
    <LocationsContext.Provider value={{ locations, refetch }}>
      {children}
    </LocationsContext.Provider>
  )
}

export function useLocations(): LocationsContextType {
  return useContext(LocationsContext)
}
