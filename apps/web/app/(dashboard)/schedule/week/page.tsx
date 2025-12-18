'use client'

import { useState, useEffect } from 'react'
import { startOfWeek, addWeeks, subWeeks } from 'date-fns'
import PageHeader from '@/components/ui/PageHeader'
import WeekPlannerHeader from './components/WeekPlannerHeader'
import WeekPlannerGrid from './components/WeekPlannerGrid'
import ShiftModal, { ShiftFormData } from './components/ShiftModal'
import { useWeekShifts, Shift } from './hooks/useWeekShifts'
import { useTenantSettings } from './hooks/useTenantSettings'

export default function WeekPlannerPage() {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [modalOpen, setModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [defaultDate, setDefaultDate] = useState<Date | undefined>()
  const [defaultStaffId, setDefaultStaffId] = useState<string | undefined>()
  const [staffList, setStaffList] = useState<Array<{ id: string; first_name: string; last_name: string; preferred_name: string | null }>>([])
  const [locationList, setLocationList] = useState<Array<{ id: string; name: string }>>([])

  const { settings } = useTenantSettings()
  const { shifts, loading, error, refetch } = useWeekShifts(currentWeek)

  // Fetch staff and locations
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch('/api/staff?pageSize=1000')
        if (response.ok) {
          const data = await response.json()
          setStaffList(data.staff || [])
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

  const handleShiftClick = (shift: Shift) => {
    setEditingShift(shift)
    setModalOpen(true)
  }

  const handleSaveShift = async (formData: ShiftFormData) => {
    try {
      const url = editingShift
        ? `/api/schedule/shifts/${editingShift.id}`
        : '/api/schedule/shifts'
      
      const method = editingShift ? 'PUT' : 'POST'

      // Convert datetime-local to ISO string
      const startTime = new Date(formData.start_time).toISOString()
      const endTime = new Date(formData.end_time).toISOString()

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          start_time: startTime,
          end_time: endTime,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save shift')
      }

      // Refetch shifts
      await refetch()
    } catch (err: any) {
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

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading shifts...</div>
          </div>
        ) : (
          <WeekPlannerGrid
            weekStart={currentWeek}
            shifts={shifts}
            timezone={settings?.timezone || 'UTC'}
            onShiftClick={handleShiftClick}
          />
        )}
      </div>

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
