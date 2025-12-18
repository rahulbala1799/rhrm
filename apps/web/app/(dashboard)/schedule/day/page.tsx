'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays, subDays, startOfDay } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import PageHeader from '@/components/ui/PageHeader'
import { useDayShifts, Shift } from './hooks/useDayShifts'
import { useTenantSettings } from '../week/hooks/useTenantSettings'
import DailyCanvas from './components/DailyCanvas'
import ShiftModal, { ShiftFormData } from '../week/components/ShiftModal'
import Toast from '../week/components/Toast'
import { applyTimeToDate } from '@/lib/schedule/timezone-utils'

export default function DayViewPage() {
  const [currentDate, setCurrentDate] = useState(() => startOfDay(new Date()))
  const [modalOpen, setModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [defaultDate, setDefaultDate] = useState<Date | undefined>()
  const [defaultStaffId, setDefaultStaffId] = useState<string | undefined>()
  const [staffList, setStaffList] = useState<Array<{
    id: string
    first_name: string
    last_name: string
    preferred_name: string | null
    department: string | null
    location_id: string | null
    location?: { id: string; name: string } | null
  }>>([])
  const [locationList, setLocationList] = useState<Array<{ id: string; name: string }>>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([])

  const { settings } = useTenantSettings()
  const timezone = settings?.timezone || 'UTC'

  const {
    shifts,
    loading,
    error,
    conflicts,
    totals,
    refetch,
  } = useDayShifts(currentDate)

  // Fetch staff and locations
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch('/api/staff?pageSize=1000')
        if (response.ok) {
          const data = await response.json()
          setStaffList(
            (data.staff || []).map((staff: any) => ({
              id: staff.id,
              first_name: staff.first_name,
              last_name: staff.last_name,
              preferred_name: staff.preferred_name,
              department: staff.department,
              location_id: staff.location_id,
              location: staff.locations ? { id: staff.locations.id, name: staff.locations.name } : null,
            }))
          )
        }
      } catch (err) {
        console.error('Error fetching staff:', err)
      }
    }

    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/settings/locations')
        if (response.ok) {
          const data = await response.json()
          setLocationList(data.locations || [])
        }
      } catch (err) {
        console.error('Error fetching locations:', err)
      }
    }

    fetchStaff()
    fetchLocations()
  }, [])

  const handleShiftClick = (shift: Shift) => {
    setEditingShift(shift)
    setModalOpen(true)
  }

  const handleCellClick = (staffId: string, time: string) => {
    setDefaultStaffId(staffId)
    const [hours, minutes] = time.split(':').map(Number)
    const targetDate = new Date(currentDate)
    targetDate.setHours(hours, minutes, 0, 0)
    setDefaultDate(targetDate)
    setEditingShift(null)
    setModalOpen(true)
  }

  const handleShiftCreate = useCallback(async (staffId: string, startTime: Date, endTime: Date) => {
    try {
      // Get default location for staff
      const staff = staffList.find(s => s.id === staffId)
      const defaultLocationId = staff?.location_id || locationList[0]?.id

      if (!defaultLocationId) {
        setToast({ message: 'No location available', type: 'error' })
        return
      }

      // Convert to UTC timestamps
      const startTimeUTC = fromZonedTime(startTime, timezone).toISOString()
      const endTimeUTC = fromZonedTime(endTime, timezone).toISOString()

      const response = await fetch('/api/schedule/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staffId,
          location_id: defaultLocationId,
          start_time: startTimeUTC,
          end_time: endTimeUTC,
          status: 'draft',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create shift')
      }

      setToast({ message: 'Shift created successfully', type: 'success' })
      refetch()
    } catch (err: any) {
      setToast({
        message: err.message || 'Failed to create shift',
        type: 'error',
      })
    }
  }, [staffList, locationList, timezone, refetch])

  const handleShiftMove = useCallback(async (shiftId: string, newStaffId: string, newStartTime: Date, newEndTime: Date) => {
    try {
      const shift = shifts.find(s => s.id === shiftId)
      if (!shift) {
        setToast({ message: 'Shift not found', type: 'error' })
        return
      }

      // Convert to UTC timestamps
      const startTimeUTC = fromZonedTime(newStartTime, timezone).toISOString()
      const endTimeUTC = fromZonedTime(newEndTime, timezone).toISOString()

      const response = await fetch(`/api/schedule/shifts/${shiftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: newStaffId,
          start_time: startTimeUTC,
          end_time: endTimeUTC,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Failed to move shift'
        if (errorMessage.includes('overlap')) {
          setToast({ message: 'Cannot move: overlaps another shift', type: 'error' })
        } else {
          setToast({ message: errorMessage, type: 'error' })
        }
        return
      }

      setToast({ message: 'Shift moved successfully', type: 'success' })
      refetch()
    } catch (err: any) {
      setToast({
        message: err.message || 'Failed to move shift',
        type: 'error',
      })
    }
  }, [shifts, timezone, refetch])

  const handleShiftResize = useCallback(async (shiftId: string, newStartTime: Date, newEndTime: Date) => {
    try {
      // Convert to UTC timestamps
      const startTimeUTC = fromZonedTime(newStartTime, timezone).toISOString()
      const endTimeUTC = fromZonedTime(newEndTime, timezone).toISOString()

      const response = await fetch(`/api/schedule/shifts/${shiftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTimeUTC,
          end_time: endTimeUTC,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Failed to resize shift'
        if (errorMessage.includes('overlap')) {
          setToast({ message: 'Cannot resize: overlaps another shift', type: 'error' })
        } else {
          setToast({ message: errorMessage, type: 'error' })
        }
        return
      }

      setToast({ message: 'Shift resized successfully', type: 'success' })
      refetch()
    } catch (err: any) {
      setToast({
        message: err.message || 'Failed to resize shift',
        type: 'error',
      })
    }
  }, [timezone, refetch])

  const handleSaveShift = async (formData: ShiftFormData) => {
    try {
      const url = editingShift ? `/api/schedule/shifts/${editingShift.id}` : '/api/schedule/shifts'
      const method = editingShift ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save shift')
      }

      setToast({
        message: editingShift ? 'Shift updated successfully' : 'Shift created successfully',
        type: 'success',
      })
      setModalOpen(false)
      setEditingShift(null)
      refetch()
    } catch (err: any) {
      setToast({
        message: err.message || 'Failed to save shift',
        type: 'error',
      })
    }
  }

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const response = await fetch(`/api/schedule/shifts/${shiftId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete shift')
      }

      setToast({
        message: 'Shift deleted successfully',
        type: 'success',
      })
      refetch()
    } catch (err: any) {
      setToast({
        message: err.message || 'Failed to delete shift',
        type: 'error',
      })
    }
  }

  const handleShiftDuplicate = useCallback(async (shift: Shift) => {
    try {
      const staff = staffList.find(s => s.id === shift.staff_id)
      const defaultLocationId = staff?.location_id || shift.location_id || locationList[0]?.id

      if (!defaultLocationId) {
        setToast({ message: 'No location available', type: 'error' })
        return
      }

      const response = await fetch('/api/schedule/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: shift.staff_id,
          location_id: defaultLocationId,
          role_id: shift.role_id,
          start_time: shift.start_time,
          end_time: shift.end_time,
          break_duration_minutes: shift.break_duration_minutes,
          status: 'draft',
          notes: shift.notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to duplicate shift')
      }

      setToast({ message: 'Shift duplicated successfully', type: 'success' })
      refetch()
    } catch (err: any) {
      setToast({
        message: err.message || 'Failed to duplicate shift',
        type: 'error',
      })
    }
  }, [staffList, locationList, refetch])

  const handleShiftPublish = useCallback(async (shiftId: string) => {
    try {
      const response = await fetch(`/api/schedule/shifts/${shiftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to publish shift')
      }

      setToast({ message: 'Shift published successfully', type: 'success' })
      refetch()
    } catch (err: any) {
      setToast({
        message: err.message || 'Failed to publish shift',
        type: 'error',
      })
    }
  }, [refetch])

  const handleShiftUnpublish = useCallback(async (shiftId: string) => {
    try {
      const response = await fetch(`/api/schedule/shifts/${shiftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to unpublish shift')
      }

      setToast({ message: 'Shift unpublished successfully', type: 'success' })
      refetch()
    } catch (err: any) {
      setToast({
        message: err.message || 'Failed to unpublish shift',
        type: 'error',
      })
    }
  }, [refetch])

  const handleBulkPublish = useCallback(async () => {
    try {
      const draftShifts = shifts.filter(s => s.status === 'draft')
      if (draftShifts.length === 0) {
        setToast({ message: 'No draft shifts to publish', type: 'warning' })
        return
      }

      // Publish all drafts
      const promises = draftShifts.map(shift =>
        fetch(`/api/schedule/shifts/${shift.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'published' }),
        })
      )

      const results = await Promise.allSettled(promises)
      const failed = results.filter(r => r.status === 'rejected').length

      if (failed > 0) {
        setToast({
          message: `Published ${draftShifts.length - failed} shifts, ${failed} failed`,
          type: failed === draftShifts.length ? 'error' : 'warning',
        })
      } else {
        setToast({
          message: `Published ${draftShifts.length} shift${draftShifts.length > 1 ? 's' : ''} successfully`,
          type: 'success',
        })
      }

      refetch()
    } catch (err: any) {
      setToast({
        message: err.message || 'Failed to publish shifts',
        type: 'error',
      })
    }
  }, [shifts, refetch])

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(startOfDay(newDate))
    setSelectedShiftIds([]) // Clear selection when changing date
  }

  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        title="Day View"
        description={`Schedule for ${format(currentDate, 'EEEE, MMMM d, yyyy')}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Scheduling', href: '/schedule' },
          { label: 'Day View' },
        ]}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between border-b bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDateChange(subDays(currentDate, 1))}
              className="rounded px-3 py-1 text-sm hover:bg-gray-100"
            >
              ← Yesterday
            </button>
            <button
              onClick={() => handleDateChange(new Date())}
              className="rounded px-3 py-1 text-sm font-medium hover:bg-gray-100"
            >
              Today
            </button>
            <button
              onClick={() => handleDateChange(addDays(currentDate, 1))}
              className="rounded px-3 py-1 text-sm hover:bg-gray-100"
            >
              Tomorrow →
            </button>
            <div className="ml-4 text-lg font-semibold">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSnapEnabled(!snapEnabled)}
              className={`px-3 py-1 text-sm rounded ${
                snapEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
              title="Toggle 15-minute grid snapping"
            >
              📏 Snap
            </button>
            {shifts.filter(s => s.status === 'draft').length > 0 && (
              <button
                onClick={handleBulkPublish}
                className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                title="Publish all draft shifts"
              >
                Publish All ({shifts.filter(s => s.status === 'draft').length})
              </button>
            )}
            <div className="text-sm text-gray-600">
              {totals?.totalShifts || 0} shifts • {totals?.totalStaff || 0} staff • {totals?.totalHours?.toFixed(1) || 0} hours
            </div>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-gray-500">Loading shifts...</div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-red-500">Error: {error}</div>
            </div>
          ) : (
            <DailyCanvas
              date={currentDate}
              shifts={shifts}
              staffList={staffList}
              timezone={timezone}
              conflicts={conflicts}
              onShiftClick={handleShiftClick}
              onCellClick={handleCellClick}
              onDeleteShift={handleDeleteShift}
              onShiftCreate={handleShiftCreate}
              onShiftMove={handleShiftMove}
              onShiftResize={handleShiftResize}
              onShiftDuplicate={handleShiftDuplicate}
              onShiftPublish={handleShiftPublish}
              onShiftUnpublish={handleShiftUnpublish}
              snapEnabled={snapEnabled}
              selectedShiftIds={selectedShiftIds}
              onSelectionChange={setSelectedShiftIds}
            />
          )}
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Shift Modal */}
      <ShiftModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingShift(null)
        }}
        shift={editingShift}
        onSave={handleSaveShift}
        staffList={staffList}
        locationList={locationList}
        defaultDate={defaultDate}
        defaultStaffId={defaultStaffId}
      />
    </div>
  )
}
