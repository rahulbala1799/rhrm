'use client'

import { useState, useEffect } from 'react'
import { format, addDays, subDays, startOfDay } from 'date-fns'
import PageHeader from '@/components/ui/PageHeader'
import { useDayShifts, Shift } from './hooks/useDayShifts'
import { useTenantSettings } from '../week/hooks/useTenantSettings'
import DailyCanvas from './components/DailyCanvas'
import ShiftModal, { ShiftFormData } from '../week/components/ShiftModal'
import Toast from '../week/components/Toast'

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

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(startOfDay(newDate))
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
        {/* Date Navigation */}
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
          <div className="text-sm text-gray-600">
            {totals?.totalShifts || 0} shifts • {totals?.totalStaff || 0} staff • {totals?.totalHours?.toFixed(1) || 0} hours
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
