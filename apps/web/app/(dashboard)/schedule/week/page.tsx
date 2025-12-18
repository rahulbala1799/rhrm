'use client'

import { useState, useEffect } from 'react'
import { startOfWeek, addWeeks, subWeeks, addDays, format } from 'date-fns'
import PageHeader from '@/components/ui/PageHeader'
import WeekPlannerHeader from './components/WeekPlannerHeader'
import StaffRowScheduler from './components/StaffRowScheduler'
import ShiftModal, { ShiftFormData } from './components/ShiftModal'
import Toast from './components/Toast'
import { useWeekShifts, Shift, WeekShiftsResponse } from './hooks/useWeekShifts'
import { useTenantSettings } from './hooks/useTenantSettings'
import { useOptimisticShifts } from './hooks/useOptimisticShifts'
import { applyTimeToDate, toTenantTimezone } from '@/lib/schedule/timezone-utils'
import { CloudArrowUpIcon } from '@heroicons/react/24/outline'

export default function WeekPlannerPage() {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
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

  const { settings } = useTenantSettings()
  const timezone = settings?.timezone || 'UTC'
  
  // Use optimistic shifts hook
  const {
    shifts,
    loading,
    error,
    syncing,
    conflicts,
    createShift,
    updateShift,
    deleteShift,
    refetch,
  } = useOptimisticShifts(currentWeek)

  // Fetch staff and locations
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch('/api/staff?pageSize=1000')
        if (response.ok) {
          const data = await response.json()
          // Ensure we have all required fields
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

  const handleCreateShift = () => {
    setEditingShift(null)
    setDefaultDate(undefined)
    setDefaultStaffId(undefined)
    setModalOpen(true)
  }

  const handleCellClick = (staffId: string, dayIndex: number, dayDate: Date) => {
    setDefaultStaffId(staffId)
    setDefaultDate(dayDate)
    setEditingShift(null)
    setModalOpen(true)
  }

  const handleShiftClick = (shift: Shift) => {
    setEditingShift(shift)
    setModalOpen(true)
  }

  const handleShiftDrop = async (
    shiftId: string,
    targetStaffId: string,
    targetDayIndex: number,
    targetDate: Date
  ) => {
    try {
      const originalShift = shifts.find((s) => s.id === shiftId)
      if (!originalShift) {
        setToast({ message: 'Shift not found', type: 'error' })
        return
      }

      // Preserve clock times in tenant timezone
      const originalStartLocal = toTenantTimezone(originalShift.start_time, timezone)
      const originalEndLocal = toTenantTimezone(originalShift.end_time, timezone)

      const startHours = originalStartLocal.getHours()
      const startMinutes = originalStartLocal.getMinutes()
      const endHours = originalEndLocal.getHours()
      const endMinutes = originalEndLocal.getMinutes()

      // Apply same HH:mm to target date
      let newStartTime = applyTimeToDate(targetDate, startHours, startMinutes, timezone)
      let newEndTime = applyTimeToDate(targetDate, endHours, endMinutes, timezone)

      // If end time is before start time (overnight), add 1 day to end
      if (new Date(newEndTime) < new Date(newStartTime)) {
        const endDate = addDays(targetDate, 1)
        newEndTime = applyTimeToDate(endDate, endHours, endMinutes, timezone)
      }

      await updateShift(shiftId, {
        staff_id: targetStaffId,
        start_time: newStartTime,
        end_time: newEndTime,
      })
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to move shift'
      if (errorMessage.includes('overlap')) {
        setToast({ message: 'Shift not saved: overlaps another shift.', type: 'error' })
      } else if (errorMessage.includes('permission')) {
        setToast({ message: 'Not allowed: you don\'t have permission.', type: 'error' })
      } else {
        setToast({ message: errorMessage, type: 'error' })
      }
    }
  }

  const handleSaveShift = async (formData: ShiftFormData) => {
    try {
      // Convert datetime-local to ISO string (already in UTC from form)
      const startTime = new Date(formData.start_time).toISOString()
      const endTime = new Date(formData.end_time).toISOString()

      if (editingShift) {
        await updateShift(editingShift.id, {
          staff_id: formData.staff_id,
          location_id: formData.location_id,
          role_id: formData.role_id || null,
          start_time: startTime,
          end_time: endTime,
          break_duration_minutes: formData.break_duration_minutes || 0,
          status: formData.status || 'draft',
          notes: formData.notes || null,
        })
        setToast({ message: 'Shift updated successfully', type: 'success' })
      } else {
        await createShift({
          staff_id: formData.staff_id,
          location_id: formData.location_id,
          role_id: formData.role_id || null,
          start_time: startTime,
          end_time: endTime,
          break_duration_minutes: formData.break_duration_minutes || 0,
          status: formData.status || 'draft',
          notes: formData.notes || null,
        })
        setToast({ message: 'Shift created successfully', type: 'success' })
      }
      setModalOpen(false)
      setEditingShift(null)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save shift'
      if (errorMessage.includes('overlap')) {
        setToast({ message: 'Shift not saved: overlaps another shift.', type: 'error' })
      } else if (errorMessage.includes('permission')) {
        setToast({ message: 'Not allowed: you don\'t have permission.', type: 'error' })
      } else {
        setToast({ message: errorMessage, type: 'error' })
      }
      throw err
    }
  }

  const handleTodayClick = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Week Planner"
          description="Plan and manage shifts for the week"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Scheduling', href: '/schedule' },
            { label: 'Week Planner' },
          ]}
        />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        title="Week Planner"
        description="Plan and manage shifts for the week"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Scheduling', href: '/schedule' },
          { label: 'Week Planner' },
        ]}
      />

      <WeekPlannerHeader
        currentWeek={currentWeek}
        onWeekChange={setCurrentWeek}
        onTodayClick={handleTodayClick}
        onCreateShift={handleCreateShift}
        canCreateShift={true}
      />

      {/* Syncing indicator */}
      {syncing && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2 text-sm text-blue-700">
          <CloudArrowUpIcon className="h-4 w-4 animate-pulse" />
          <span>Syncing...</span>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading shifts...</div>
          </div>
        ) : (
          <StaffRowScheduler
            weekStart={currentWeek}
            shifts={shifts}
            staffList={staffList}
            timezone={timezone}
            conflicts={conflicts}
            onShiftClick={handleShiftClick}
            onCellClick={handleCellClick}
            onShiftDrop={handleShiftDrop}
          />
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

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
