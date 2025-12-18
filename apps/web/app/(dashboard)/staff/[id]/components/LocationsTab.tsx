'use client'

import { useState, useEffect } from 'react'

interface Location {
  id: string
  name: string
  address: string | null
  postcode: string | null
  assigned_at: string
}

interface LocationsTabProps {
  staffId: string
}

export default function LocationsTab({ staffId }: LocationsTabProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [allLocations, setAllLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')

  useEffect(() => {
    fetchStaffLocations()
    fetchAllLocations()
  }, [staffId])

  const fetchStaffLocations = async () => {
    try {
      const response = await fetch(`/api/staff/${staffId}/locations`)
      if (!response.ok) throw new Error('Failed to fetch')
      const { locations } = await response.json()
      setLocations(locations || [])
    } catch (error) {
      console.error('Error fetching staff locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllLocations = async () => {
    try {
      const response = await fetch('/api/settings/locations')
      if (response.ok) {
        const { locations } = await response.json()
        setAllLocations(locations || [])
      }
    } catch (error) {
      console.error('Error fetching all locations:', error)
    }
  }

  const handleAssignLocation = async () => {
    if (!selectedLocationId) return

    try {
      const response = await fetch(`/api/staff/${staffId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: selectedLocationId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign location')
      }

      setShowAssignModal(false)
      setSelectedLocationId('')
      fetchStaffLocations()
      alert('Location assigned successfully!')
    } catch (error: any) {
      console.error('Error assigning location:', error)
      alert(error.message || 'Failed to assign location')
    }
  }

  const handleRemoveLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to remove this location?')) return

    try {
      const response = await fetch(`/api/staff/${staffId}/locations/${locationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove location')
      }

      fetchStaffLocations()
      alert('Location removed successfully!')
    } catch (error: any) {
      console.error('Error removing location:', error)
      alert(error.message || 'Failed to remove location')
    }
  }

  // Get available locations (not already assigned)
  const availableLocations = allLocations.filter(
    (location) => !locations.some((assigned) => assigned.id === location.id)
  )

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Locations</h3>
          <button
            onClick={() => setShowAssignModal(true)}
            disabled={availableLocations.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Assign Location
          </button>
        </div>

        {locations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No locations assigned to this staff member.</p>
            <p className="text-sm mt-2">Click "Assign Location" to add a location.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg border-2 border-gray-300 flex items-center justify-center bg-blue-50">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{location.name}</div>
                    {(location.address || location.postcode) && (
                      <div className="text-sm text-gray-500">
                        {location.address}
                        {location.address && location.postcode && ', '}
                        {location.postcode}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveLocation(location.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Location Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Assign Location</h2>
            {availableLocations.length === 0 ? (
              <div className="py-4">
                <p className="text-gray-600">All available locations have been assigned to this staff member.</p>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Location
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a location...</option>
                    {availableLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleAssignLocation}
                    disabled={!selectedLocationId}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Assign Location
                  </button>
                  <button
                    onClick={() => {
                      setShowAssignModal(false)
                      setSelectedLocationId('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

