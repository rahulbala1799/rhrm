'use client'

import { useState, useEffect, useMemo } from 'react'
import { XMarkIcon, ClockIcon, MapPinIcon, UserIcon, BriefcaseIcon, ChatBubbleLeftIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
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

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  published: { label: 'Published', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  confirmed: { label: 'Confirmed', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
}

const breakOptions = [
  { value: 0, label: 'No break' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
]

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
  const [showNotes, setShowNotes] = useState(false)

  const isEditing = !!shift

  // Selected staff display name
  const selectedStaff = useMemo(() => {
    return staffList.find(s => s.id === formData.staff_id)
  }, [staffList, formData.staff_id])

  // Merged locations: staff-specific locations + fallback to tenant-wide
  const availableLocations = useMemo(() => {
    if (loadingStaffData) return []
    if (staffLocations.length > 0) return staffLocations
    // When staff has no specific locations, show all tenant locations
    return locationList
  }, [staffLocations, locationList, loadingStaffData])

  // Parse date and time from datetime-local string
  const dateValue = useMemo(() => {
    if (!formData.start_time) return ''
    return formData.start_time.split('T')[0]
  }, [formData.start_time])

  const startTimeValue = useMemo(() => {
    if (!formData.start_time) return ''
    return formData.start_time.split('T')[1] || ''
  }, [formData.start_time])

  const endTimeValue = useMemo(() => {
    if (!formData.end_time) return ''
    return formData.end_time.split('T')[1] || ''
  }, [formData.end_time])

  // Calculate total hours display
  const totalHours = useMemo(() => {
    if (!formData.start_time || !formData.end_time) return null
    const start = new Date(formData.start_time)
    const end = new Date(formData.end_time)
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    if (diff <= 0) return null
    const net = diff - (formData.break_duration_minutes / 60)
    return net > 0 ? net.toFixed(1) : null
  }, [formData.start_time, formData.end_time, formData.break_duration_minutes])

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
      const [rolesRes, locsRes] = await Promise.all([
        fetch(`/api/staff/${staffId}/roles`),
        fetch(`/api/staff/${staffId}/locations`),
      ])

      if (rolesRes.ok) {
        const { roles } = await rolesRes.json()
        setStaffRoles(roles || [])
        // Auto-select if only one role
        if (roles?.length === 1 && !shift) {
          setFormData(prev => ({ ...prev, role_id: roles[0].id }))
        } else if (shift?.role_id) {
          setFormData(prev => ({ ...prev, role_id: shift.role_id }))
        }
      }

      if (locsRes.ok) {
        const { locations } = await locsRes.json()
        setStaffLocations(locations || [])
        // Auto-select if only one location
        if (locations?.length === 1 && !shift) {
          setFormData(prev => ({ ...prev, location_id: locations[0].id }))
        } else if (shift?.location_id) {
          // Ensure shift's location is in list
          const found = locations?.find((l: { id: string }) => l.id === shift.location_id)
          if (!found && shift.location_id) {
            const fallback = locationList.find(l => l.id === shift.location_id)
            if (fallback) {
              setStaffLocations(prev => [...prev, fallback])
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching staff data:', err)
    } finally {
      setLoadingStaffData(false)
    }
  }

  // Initialize form data
  useEffect(() => {
    if (shift) {
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
      setShowNotes(!!(shift.notes))
    } else if (defaultDate && defaultStaffId) {
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
      setShowNotes(false)
    } else {
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
      setShowNotes(false)
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

  const updateDate = (newDate: string) => {
    const startTime = startTimeValue || '09:00'
    const endTime = endTimeValue || '17:00'
    setFormData(prev => ({
      ...prev,
      start_time: `${newDate}T${startTime}`,
      end_time: `${newDate}T${endTime}`,
    }))
  }

  const updateStartTime = (time: string) => {
    const date = dateValue || format(new Date(), 'yyyy-MM-dd')
    setFormData(prev => ({ ...prev, start_time: `${date}T${time}` }))
  }

  const updateEndTime = (time: string) => {
    const date = dateValue || format(new Date(), 'yyyy-MM-dd')
    setFormData(prev => ({ ...prev, end_time: `${date}T${time}` }))
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full sm:max-w-md bg-white sm:rounded-2xl shadow-2xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit shift' : 'New shift'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="px-5 space-y-4 pb-4">

              {/* Staff member */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  <UserIcon className="w-3.5 h-3.5" />
                  Staff member
                </label>
                <div className="relative">
                  <select
                    value={formData.staff_id}
                    onChange={(e) => setFormData({ ...formData, staff_id: e.target.value, location_id: '', role_id: null })}
                    required
                    className="w-full appearance-none px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors pr-10"
                  >
                    <option value="">Choose staff member…</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.preferred_name || `${staff.first_name} ${staff.last_name}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Role — always visible when staff is selected, pill selector */}
              {formData.staff_id && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    <BriefcaseIcon className="w-3.5 h-3.5" />
                    Role
                    {staffRoles.length > 1 && <span className="text-red-400">*</span>}
                  </label>
                  {loadingStaffData ? (
                    <div className="flex gap-2">
                      <div className="h-9 w-20 bg-gray-100 rounded-lg animate-pulse" />
                      <div className="h-9 w-24 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                  ) : staffRoles.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No roles assigned — optional</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {staffRoles.map((role) => {
                        const isSelected = formData.role_id === role.id
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, role_id: isSelected ? null : role.id }))}
                            className={`
                              px-3.5 py-2 rounded-xl text-sm font-medium border-2 transition-all
                              ${isSelected
                                ? 'shadow-sm scale-[1.02]'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}
                            `}
                            style={isSelected ? {
                              backgroundColor: role.bg_color || '#EFF6FF',
                              color: role.text_color || '#1D4ED8',
                              borderColor: role.bg_color || '#BFDBFE',
                            } : undefined}
                          >
                            {role.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Location — always visible when staff is selected */}
              {formData.staff_id && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    <MapPinIcon className="w-3.5 h-3.5" />
                    Location
                  </label>
                  {loadingStaffData ? (
                    <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                  ) : availableLocations.length === 0 ? (
                    <p className="text-sm text-amber-600">No locations assigned. <a href={`/staff/${formData.staff_id}`} className="underline hover:text-amber-700">Add in profile →</a></p>
                  ) : availableLocations.length <= 4 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableLocations.map((loc) => {
                        const isSelected = formData.location_id === loc.id
                        return (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, location_id: loc.id }))}
                            className={`
                              px-3.5 py-2 rounded-xl text-sm font-medium border-2 transition-all
                              ${isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}
                            `}
                          >
                            {loc.name}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={formData.location_id}
                        onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                        required
                        className="w-full appearance-none px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors pr-10"
                      >
                        <option value="">Choose location…</option>
                        {availableLocations.map((loc) => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                      <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                </div>
              )}

              {/* Date + Time row */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  <ClockIcon className="w-3.5 h-3.5" />
                  Date & time
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
                  {/* Date */}
                  <input
                    type="date"
                    value={dateValue}
                    onChange={(e) => updateDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {/* Time range */}
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={startTimeValue}
                      onChange={(e) => updateStartTime(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-400 text-sm font-medium">to</span>
                    <input
                      type="time"
                      value={endTimeValue}
                      onChange={(e) => updateEndTime(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {/* Break + total summary */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Break:</span>
                      <div className="flex gap-1">
                        {breakOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, break_duration_minutes: opt.value }))}
                            className={`
                              px-2 py-1 text-xs rounded-md transition-colors
                              ${formData.break_duration_minutes === opt.value
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-500 hover:bg-gray-100'}
                            `}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {totalHours && (
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                        {totalHours}h net
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status pills */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Status</label>
                <div className="flex gap-2">
                  {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((key) => {
                    const cfg = statusConfig[key]
                    const isSelected = formData.status === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, status: key }))}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                          ${isSelected ? cfg.color + ' shadow-sm' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'}
                        `}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? cfg.dot : 'bg-gray-300'}`} />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Notes toggle */}
              {!showNotes ? (
                <button
                  type="button"
                  onClick={() => setShowNotes(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                  Add notes
                </button>
              ) : (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Add shift notes…"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors resize-none"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50 sm:rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Saving…
                  </span>
                ) : isEditing ? 'Update shift' : 'Create shift'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
