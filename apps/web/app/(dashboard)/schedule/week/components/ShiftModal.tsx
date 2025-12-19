'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Shift } from '@/lib/schedule/types'
import { format } from 'date-fns'

interface ShiftModalProps {
  isOpen: boolean
  onClose: () => void
  shift?: Shift | null
  onSave: (data: ShiftFormData) => Promise<void>
  staffList?: Array<{ id: string; first_name: string; last_name: string; preferred_name: string | null }>
  locationList?: Array<{ id: string; name: string }>
  defaultDate?: Date
  defaultStaffId?: string
}

export interface ShiftFormData {
  staff_id: string
  location_id: string
  role_id?: string | null
  start_time: string
  end_time: string
  break_duration_minutes: number
  notes: string
  status: 'draft' | 'published' | 'confirmed' | 'cancelled'
}

export default function ShiftModal({
  isOpen,
  onClose,
  shift,
  onSave,
  staffList = [],
  locationList = [],
  defaultDate,
  defaultStaffId,
}: ShiftModalProps) {
  const [formData, setFormData] = useState<ShiftFormData>({
    staff_id: '',
    location_id: '',
    role_id: null,
    start_time: '',
    end_time: '',
    break_duration_minutes: 0,
    notes: '',
    status: 'draft',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [staffRoles, setStaffRoles] = useState<Array<{ id: string; name: string; description: string | null; bg_color: string; text_color: string }>>([])
  const [staffLocations, setStaffLocations] = useState<Array<{ id: string; name: string }>>([])
  const [loadingStaffData, setLoadingStaffData] = useState(false)
  const [roleValidationError, setRoleValidationError] = useState<string | null>(null)

  // Fetch staff roles and locations when staff_id changes
  useEffect(() => {
    if (formData.staff_id) {
      fetchStaffRolesAndLocations(formData.staff_id)
    } else {
      setStaffRoles([])
      setStaffLocations([])
    }
  }, [formData.staff_id])

  const fetchStaffRolesAndLocations = async (staffId: string) => {
    setLoadingStaffData(true)
    try {
      // Fetch roles
      const rolesResponse = await fetch(`/api/staff/${staffId}/roles`)
      if (rolesResponse.ok) {
        const { roles } = await rolesResponse.json()
        setStaffRoles(roles || [])

        // Auto-select role if only one
        if (roles && roles.length === 1 && !shift) {
          setFormData(prev => ({ ...prev, role_id: roles[0].id }))
          setRoleValidationError(null)
        } else if (shift && shift.role_id) {
          // Validate existing shift role
          const hasRole = roles?.some((r: { id: string }) => r.id === shift.role_id)
          if (!hasRole && roles && roles.length > 0) {
            setRoleValidationError(`This staff member doesn't have the selected role`)
          } else {
            setRoleValidationError(null)
          }
          setFormData(prev => ({ ...prev, role_id: shift.role_id }))
        } else {
          setRoleValidationError(null)
        }
      }

      // Fetch staff locations from new API
      const locationsResponse = await fetch(`/api/staff/${staffId}/locations`)
      if (locationsResponse.ok) {
        const { locations } = await locationsResponse.json()
        setStaffLocations(locations || [])

        // Auto-select location if only one and not editing
        if (locations && locations.length === 1 && !shift) {
          setFormData(prev => ({ ...prev, location_id: locations[0].id }))
        } else if (shift && shift.location_id) {
          // When editing, ensure the shift's location is in the list
          const shiftLocation = locations?.find((loc: { id: string }) => loc.id === shift.location_id)
          if (!shiftLocation && shift.location_id) {
            // If shift location is not in staff's assigned locations, add it temporarily
            const allLocation = locationList.find(loc => loc.id === shift.location_id)
            if (allLocation) {
              setStaffLocations(prev => [...(prev || []), allLocation])
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching staff data:', error)
    } finally {
      setLoadingStaffData(false)
    }
  }

  useEffect(() => {
    if (shift) {
      // Editing existing shift
      const startTime = new Date(shift.start_time)
      const endTime = new Date(shift.end_time)
      
      setFormData({
        staff_id: shift.staff_id,
        location_id: shift.location_id,
        role_id: shift.role_id || null,
        start_time: format(startTime, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(endTime, "yyyy-MM-dd'T'HH:mm"),
        break_duration_minutes: shift.break_duration_minutes || 0,
        notes: shift.notes || '',
        status: shift.status,
      })
      // Fetch roles for this staff
      if (shift.staff_id) {
        fetchStaffRolesAndLocations(shift.staff_id)
      }
    } else if (defaultDate && defaultStaffId) {
      // Creating new shift with defaults
      const defaultStart = new Date(defaultDate)
      defaultStart.setHours(9, 0, 0, 0)
      const defaultEnd = new Date(defaultStart)
      defaultEnd.setHours(17, 0, 0, 0)
      
      setFormData({
        staff_id: defaultStaffId,
        location_id: '',
        role_id: null,
        start_time: format(defaultStart, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(defaultEnd, "yyyy-MM-dd'T'HH:mm"),
        break_duration_minutes: 30,
        notes: '',
        status: 'draft',
      })
      // Fetch roles for default staff
      if (defaultStaffId) {
        fetchStaffRolesAndLocations(defaultStaffId)
      }
    } else {
      // Creating new shift without defaults
      const now = new Date()
      const defaultStart = new Date(now)
      defaultStart.setHours(9, 0, 0, 0)
      const defaultEnd = new Date(defaultStart)
      defaultEnd.setHours(17, 0, 0, 0)
      
      setFormData({
        staff_id: '',
        location_id: '',
        role_id: null,
        start_time: format(defaultStart, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(defaultEnd, "yyyy-MM-dd'T'HH:mm"),
        break_duration_minutes: 30,
        notes: '',
        status: 'draft',
      })
    }
    setError(null)
  }, [shift, defaultDate, defaultStaffId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await onSave(formData)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save shift')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {shift ? 'Edit Shift' : 'Create Shift'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Staff */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Staff Member *
                </label>
                <select
                  value={formData.staff_id}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select staff member</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.preferred_name || `${staff.first_name} ${staff.last_name}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role - Show if staff has 2+ roles or 0 roles */}
              {staffRoles.length !== 1 && formData.staff_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role {staffRoles.length > 1 ? '*' : ''}
                  </label>
                  <select
                    value={formData.role_id || ''}
                    onChange={(e) => {
                      const selectedRoleId = e.target.value || null
                      // Validate role selection
                      if (selectedRoleId && staffRoles.length > 0) {
                        const hasRole = staffRoles.some(r => r.id === selectedRoleId)
                        if (!hasRole) {
                          const selectedRole = staffRoles.find(r => r.id === selectedRoleId)
                          const roleName = selectedRole?.name || 'Unknown Role'
                          setRoleValidationError(`This staff member doesn't have ${roleName} role`)
                        } else {
                          setRoleValidationError(null)
                        }
                      } else {
                        setRoleValidationError(null)
                      }
                      setFormData({ ...formData, role_id: selectedRoleId })
                    }}
                    required={staffRoles.length > 1}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      roleValidationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">{staffRoles.length === 0 ? 'No roles assigned (optional)' : 'Select role'}</option>
                    {staffRoles.map((role) => (
                      <option key={role.id} value={role.id} title={role.description || undefined}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  {roleValidationError && (
                    <p className="mt-1 text-xs text-red-600">{roleValidationError}</p>
                  )}
                  {staffRoles.length === 0 && !roleValidationError && (
                    <p className="mt-1 text-xs text-gray-500">Assign roles to this staff member in their profile</p>
                  )}
                </div>
              )}

              {/* Location - Show if staff has 2+ locations or 0 locations */}
              {(staffLocations.length !== 1 || !formData.staff_id) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  {staffLocations.length === 0 && formData.staff_id ? (
                    <div className="w-full px-3 py-2 border border-red-300 rounded-lg bg-red-50">
                      <p className="text-sm text-red-800">
                        No locations assigned to this staff member. Please assign locations in their profile.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={formData.location_id}
                      onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select location</option>
                      {staffLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {staffLocations.length === 0 && formData.staff_id && (
                    <p className="mt-1 text-xs text-gray-500">Assign locations to this staff member in their profile</p>
                  )}
                </div>
              )}

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Break Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Break Duration (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.break_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, break_duration_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !!roleValidationError}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : shift ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}


