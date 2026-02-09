'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocations } from '@/app/(dashboard)/contexts/LocationsContext'

interface StaffFiltersProps {
  onFilterChange?: () => void
}

export default function StaffFilters({ onFilterChange }: StaffFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locations } = useLocations()
  
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [locationId, setLocationId] = useState(searchParams.get('location_id') || '')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Update URL when filters change (but not on initial mount)
  const [isInitialMount, setIsInitialMount] = useState(true)
  
  useEffect(() => {
    setIsInitialMount(false)
  }, [])

  useEffect(() => {
    // Skip URL update on initial mount to avoid unnecessary navigation
    if (isInitialMount) return

    const params = new URLSearchParams()
    
    // Validate and sanitize search
    if (debouncedSearch.trim()) {
      params.set('search', debouncedSearch.trim())
    }
    
    // Validate status (must be valid enum)
    const validStatuses = ['active', 'on_leave', 'terminated']
    if (status && validStatuses.includes(status)) {
      params.set('status', status)
    }
    
    // Validate location_id (must be valid UUID format)
    if (locationId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(locationId)) {
        params.set('location_id', locationId)
      }
    }
    
    // Reset to page 1 when filters change
    params.set('page', '1')
    
    const newUrl = params.toString() ? `/staff?${params.toString()}` : '/staff'
    router.push(newUrl)
    
    if (onFilterChange) {
      onFilterChange()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status, locationId])

  const hasActiveFilters = debouncedSearch || status || locationId

  const clearFilters = () => {
    setSearchInput('')
    setDebouncedSearch('')
    setStatus('')
    setLocationId('')
  }

  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-white">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full sm:w-auto">
          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name, email, or employee number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[140px]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>

          {/* Location Filter */}
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[160px]"
          >
            <option value="">All Locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  )
}

