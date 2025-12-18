'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays, subDays, startOfDay } from 'date-fns'
import PageHeader from '@/components/ui/PageHeader'
import { Shift } from '@/lib/schedule/types'
import { ShiftUpdateError } from '@/lib/schedule/types'
import { useOptimisticDayShifts } from './hooks/useOptimisticDayShifts'
import { useTenantSettings } from '../week/hooks/useTenantSettings'
import DailyCanvas from './components/DailyCanvas'
import ShiftModal, { ShiftFormData } from '../week/components/ShiftModal'
import Toast from '../week/components/Toast'
import { applyTimeToDate } from '@/lib/schedule/timezone-utils'
import { toUtcIsoInTenantTz } from '@/lib/schedule/shift-updates'
import { useOfflineDetection } from '../hooks/useOfflineDetection'
import { useWindowFocusRefetch } from '../hooks/useWindowFocusRefetch'
import { useUndoRedo } from './hooks/useUndoRedo'

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
  const { isOffline } = useOfflineDetection()
  const { addAction: addUndoAction } = useUndoRedo()

  const {
    shifts,
    loading,
    error,
    conflicts,
    totals,
    updateShift,
    createShift,
    deleteShift,
    refetch,
  } = useOptimisticDayShifts(currentDate)

  // Window focus refetch (rate-limited)
  useWindowFocusRefetch(refetch)

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

      // Convert to UTC timestamps using shared helper
      const startTimeUTC = toUtcIsoInTenantTz(startTime, timezone)
      const endTimeUTC = toUtcIsoInTenantTz(endTime, timezone)

      // Use hook method
      const newShift = await createShift({
        staff_id: staffId,
        location_id: defaultLocationId,
        start_time: startTimeUTC,
        end_time: endTimeUTC,
        status: 'draft',
      })

      // Add undo action
      addUndoAction({
        type: 'create',
        shiftId: newShift.id,
        previousState: null,
        newState: {
          staff_id: staffId,
          location_id: defaultLocationId,
          start_time: startTimeUTC,
          end_time: endTimeUTC,
          status: 'draft',
        },
        execute: async () => {
          await createShift({
            staff_id: staffId,
            location_id: defaultLocationId,
            start_time: startTimeUTC,
            end_time: endTimeUTC,
            status: 'draft',
          })
        },
        reverse: async () => {
          await deleteShift(newShift.id)
        },
      })

      // No success toast for implicit actions (drag create)
    } catch (err) {
      const error = err as ShiftUpdateError
      if (error.code === 'OVERLAP') {
        setToast({ message: error.message, type: 'error' })
      } else {
        setToast({ message: error.message, type: 'error' })
      }
    }
  }, [staffList, locationList, timezone, createShift, deleteShift, addUndoAction])

  const handleShiftMove = useCallback(async (shiftId: string, newStaffId: string, newStartTime: Date, newEndTime: Date) => {
    const originalShift = shifts.find(s => s.id === shiftId)
    if (!originalShift) return

    try {
      // Convert to UTC timestamps using shared helper
      const startTimeUTC = toUtcIsoInTenantTz(newStartTime, timezone)
      const endTimeUTC = toUtcIsoInTenantTz(newEndTime, timezone)

      // Use hook method
      await updateShift(shiftId, {
        staff_id: newStaffId,
        start_time: startTimeUTC,
        end_time: endTimeUTC,
      })

      // Add undo action
      addUndoAction({
        type: 'move',
        shiftId,
        previousState: {
          staff_id: originalShift.staff_id,
          start_time: originalShift.start_time,
          end_time: originalShift.end_time,
        },
        newState: {
          staff_id: newStaffId,
          start_time: startTimeUTC,
          end_time: endTimeUTC,
        },
        execute: async () => {
          await updateShift(shiftId, {
            staff_id: newStaffId,
            start_time: startTimeUTC,
            end_time: endTimeUTC,
          })
        },
        reverse: async () => {
          await updateShift(shiftId, {
            staff_id: originalShift.staff_id,
            start_time: originalShift.start_time,
            end_time: originalShift.end_time,
          })
        },
      })

      // No success toast for implicit actions (drag)
    } catch (err) {
      const error = err as ShiftUpdateError
      if (error.code === 'OVERLAP') {
        setToast({ message: error.message, type: 'error' })
      } else if (error.code === 'FORBIDDEN') {
        setToast({ message: error.message, type: 'error' })
      } else {
        setToast({ message: error.message, type: 'error' })
      }
    }
  }, [timezone, updateShift, shifts, addUndoAction])

  const handleShiftResize = useCallback(async (shiftId: string, newStartTime: Date, newEndTime: Date) => {
    const originalShift = shifts.find(s => s.id === shiftId)
    if (!originalShift) return

    try {
      // Convert to UTC timestamps using shared helper
      const startTimeUTC = toUtcIsoInTenantTz(newStartTime, timezone)
      const endTimeUTC = toUtcIsoInTenantTz(newEndTime, timezone)

      // Use hook method
      await updateShift(shiftId, {
        start_time: startTimeUTC,
        end_time: endTimeUTC,
      })

      // Add undo action
      addUndoAction({
        type: 'resize',
        shiftId,
        previousState: {
          start_time: originalShift.start_time,
          end_time: originalShift.end_time,
        },
        newState: {
          start_time: startTimeUTC,
          end_time: endTimeUTC,
        },
        execute: async () => {
          await updateShift(shiftId, {
            start_time: startTimeUTC,
            end_time: endTimeUTC,
          })
        },
        reverse: async () => {
          await updateShift(shiftId, {
            start_time: originalShift.start_time,
            end_time: originalShift.end_time,
          })
        },
      })

      // No success toast for implicit actions (resize)
    } catch (err) {
      const error = err as ShiftUpdateError
      if (error.code === 'OVERLAP') {
        setToast({ message: error.message, type: 'error' })
      } else {
        setToast({ message: error.message, type: 'error' })
      }
    }
  }, [timezone, updateShift, shifts, addUndoAction])

  const handleSaveShift = async (formData: ShiftFormData) => {
    try {
      // Convert form times to UTC using shared helper
      const startTimeUTC = toUtcIsoInTenantTz(new Date(formData.start_time), timezone)
      const endTimeUTC = toUtcIsoInTenantTz(new Date(formData.end_time), timezone)

      if (editingShift) {
        // Use hook method for update
        await updateShift(editingShift.id, {
          staff_id: formData.staff_id,
          location_id: formData.location_id,
          role_id: formData.role_id || null,
          start_time: startTimeUTC,
          end_time: endTimeUTC,
          break_duration_minutes: formData.break_duration_minutes || 0,
          status: formData.status || 'draft',
          notes: formData.notes || null,
        })
        setToast({ message: 'Shift updated successfully', type: 'success' })
      } else {
        // Use hook method for create
        await createShift({
          staff_id: formData.staff_id,
          location_id: formData.location_id,
          role_id: formData.role_id || null,
          start_time: startTimeUTC,
          end_time: endTimeUTC,
          break_duration_minutes: formData.break_duration_minutes || 0,
          status: formData.status || 'draft',
          notes: formData.notes || null,
        })
        setToast({ message: 'Shift created successfully', type: 'success' })
      }
      setModalOpen(false)
      setEditingShift(null)
    } catch (err) {
      const error = err as ShiftUpdateError
      setToast({ message: error.message, type: 'error' })
    }
  }

  const handleDeleteShift = async (shiftId: string) => {
    const originalShift = shifts.find(s => s.id === shiftId)
    if (!originalShift) return

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this shift?')) {
      return
    }

    try {
      // Use hook method
      await deleteShift(shiftId)

      // Add undo action
      addUndoAction({
        type: 'delete',
        shiftId,
        previousState: originalShift,
        newState: null,
        execute: async () => {
          await deleteShift(shiftId)
        },
        reverse: async () => {
          await createShift({
            staff_id: originalShift.staff_id,
            location_id: originalShift.location_id,
            role_id: originalShift.role_id,
            start_time: originalShift.start_time,
            end_time: originalShift.end_time,
            break_duration_minutes: originalShift.break_duration_minutes,
            status: originalShift.status,
            notes: originalShift.notes,
          })
        },
      })

      setToast({ message: 'Shift deleted successfully', type: 'success' })
    } catch (err) {
      const error = err as ShiftUpdateError
      setToast({ message: error.message, type: 'error' })
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

      // Use hook method
      await createShift({
        staff_id: shift.staff_id,
        location_id: defaultLocationId,
        role_id: shift.role_id,
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_duration_minutes: shift.break_duration_minutes,
        status: 'draft',
        notes: shift.notes ? `COPY of ${shift.notes}` : 'COPY of shift',
      })

      setToast({ message: 'Shift duplicated successfully', type: 'success' })
    } catch (err) {
      const error = err as ShiftUpdateError
      setToast({ message: error.message, type: 'error' })
    }
  }, [staffList, locationList, createShift])

  const handleShiftPublish = useCallback(async (shiftId: string) => {
    try {
      // Use hook method
      await updateShift(shiftId, { status: 'published' })
      setToast({ message: 'Shift published successfully', type: 'success' })
    } catch (err) {
      const error = err as ShiftUpdateError
      setToast({ message: error.message, type: 'error' })
    }
  }, [updateShift])

  const handleShiftUnpublish = useCallback(async (shiftId: string) => {
    try {
      // Use hook method
      await updateShift(shiftId, { status: 'draft' })
      setToast({ message: 'Shift unpublished successfully', type: 'success' })
    } catch (err) {
      const error = err as ShiftUpdateError
      setToast({ message: error.message, type: 'error' })
    }
  }, [updateShift])

  const handleBulkPublish = useCallback(async () => {
    try {
      const draftShifts = shifts.filter(s => s.status === 'draft')
      if (draftShifts.length === 0) {
        setToast({ message: 'No draft shifts to publish', type: 'warning' })
        return
      }

      // Publish all drafts using hook method
      const promises = draftShifts.map(shift =>
        updateShift(shift.id, { status: 'published' })
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
    } catch (err) {
      const error = err as ShiftUpdateError
      setToast({ message: error.message, type: 'error' })
    }
  }, [shifts, updateShift])

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
        {/* Offline Indicator */}
        {isOffline && (
          <div className="bg-yellow-500 text-white px-4 py-2 text-sm text-center">
            You're offline. Changes will sync when connection is restored.
          </div>
        )}

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
          {/* CRITICAL: No loading state after first paint - SWR shows cached data immediately */}
          {error ? (
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
