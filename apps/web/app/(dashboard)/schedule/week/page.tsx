'use client'

import { useState, useEffect, useCallback } from 'react'
import { startOfWeek, addWeeks, subWeeks, addDays, format } from 'date-fns'
import PageHeader from '@/components/ui/PageHeader'
import WeekPlannerHeader from './components/WeekPlannerHeader'
import StaffRowScheduler from './components/StaffRowScheduler'
import ShiftModal, { ShiftFormData } from './components/ShiftModal'
import Toast from './components/Toast'
import { Shift } from '@/lib/schedule/types'
import { ShiftUpdateError } from '@/lib/schedule/types'
import { toUtcIsoInTenantTz } from '@/lib/schedule/shift-updates'
import { useWeekShifts, WeekShiftsResponse } from './hooks/useWeekShifts'
import { useTenantSettings } from './hooks/useTenantSettings'
import { useOptimisticShifts } from './hooks/useOptimisticShifts'
import { useBudgetViewToggle } from './hooks/useBudgetViewToggle'
import { useOvertimeCalculations } from './hooks/useOvertimeCalculations'
import { applyTimeToDate, toTenantTimezone } from '@/lib/schedule/timezone-utils'
import { CloudArrowUpIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import BudgetViewErrorBoundary from './components/BudgetViewErrorBoundary'
import { useOfflineDetection } from '../hooks/useOfflineDetection'
import { useWindowFocusRefetch } from '../hooks/useWindowFocusRefetch'
import { useUndoRedo } from '../day/hooks/useUndoRedo'
import { normalizeTimeForCommit } from '@/lib/schedule/shift-updates'
import ShiftContextMenu from '../day/components/ShiftContextMenu'


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
  const [staffHourlyRates, setStaffHourlyRates] = useState<Map<string, number | null>>(new Map())
  const [staffOvertimeConfigs, setStaffOvertimeConfigs] = useState<Map<string, {
    contractedWeeklyHours: number | null
    overtimeEnabled: boolean | null
    overtimeRuleType: 'multiplier' | 'flat_extra' | null
    overtimeMultiplier: number | null
    overtimeFlatExtra: number | null
    payFrequency: 'weekly' | 'fortnightly' | 'monthly' | null
  }>>(new Map())
  const [payPeriodConfig, setPayPeriodConfig] = useState<any>(null)
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([])
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    shift: Shift
  } | null>(null)

  const { settings } = useTenantSettings()
  const timezone = settings?.timezone || 'UTC'
  const { isOffline } = useOfflineDetection()
  const { addAction: addUndoAction } = useUndoRedo()
  
  // Budget view toggle
  const [budgetViewActive, setBudgetViewActive] = useBudgetViewToggle()
  const canViewBudget = userRole === 'admin' || userRole === 'manager' || userRole === 'superadmin'
  
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

  // Window focus refetch (rate-limited)
  useWindowFocusRefetch(refetch)

  // Fetch user role
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch('/api/auth/role')
        if (response.ok) {
          const data = await response.json()
          setUserRole(data.role || null)
        }
      } catch (err) {
        console.error('Error fetching role:', err)
      }
    }
    fetchRole()
  }, [])

  // Fetch pay period config
  useEffect(() => {
    const fetchPayPeriodConfig = async () => {
      try {
        const response = await fetch('/api/settings/pay-period')
        if (response.ok) {
          const data = await response.json()
          setPayPeriodConfig(data.config)
        }
      } catch (err) {
        console.error('Error fetching pay period config:', err)
      }
    }
    fetchPayPeriodConfig()
  }, [])

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
          
          // Extract hourly rates and overtime config if user has permission
          if (canViewBudget) {
            const rates = new Map<string, number | null>()
            const overtimeConfigs = new Map<string, {
              contractedWeeklyHours: number | null
              overtimeEnabled: boolean | null
              overtimeRuleType: 'multiplier' | 'flat_extra' | null
              overtimeMultiplier: number | null
              overtimeFlatExtra: number | null
              payFrequency: 'weekly' | 'fortnightly' | 'monthly' | null
            }>()
            
            ;(data.staff || []).forEach((staff: any) => {
              rates.set(staff.id, staff.hourly_rate ?? null)
              overtimeConfigs.set(staff.id, {
                contractedWeeklyHours: staff.contracted_weekly_hours ?? null,
                overtimeEnabled: staff.overtime_enabled ?? null,
                overtimeRuleType: staff.overtime_rule_type ?? null,
                overtimeMultiplier: staff.overtime_multiplier ?? null,
                overtimeFlatExtra: staff.overtime_flat_extra ?? null,
                payFrequency: staff.pay_frequency ?? null,
              })
            })
            setStaffHourlyRates(rates)
            setStaffOvertimeConfigs(overtimeConfigs)
            setIsLoadingRates(false)
          }
        }
      } catch (err) {
        console.error('Error fetching staff:', err)
        setIsLoadingRates(false)
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

    setIsLoadingRates(canViewBudget)
    fetchStaff()
    fetchLocations()
  }, [canViewBudget])

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

  const handleShiftClick = (shift: Shift, e?: React.MouseEvent) => {
    // If Shift/Cmd key is held, toggle selection instead of opening modal
    if (e && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      e.stopPropagation()
      setSelectedShiftIds((prev) => {
        if (prev.includes(shift.id)) {
          return prev.filter((id) => id !== shift.id)
        } else {
          return [...prev, shift.id]
        }
      })
    } else {
      setEditingShift(shift)
      setModalOpen(true)
    }
  }

  const handleShiftContextMenu = (shift: Shift, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      shift,
    })
  }

  // Escape clears selection, Delete removes selected shifts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if we're in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'Escape' && selectedShiftIds.length > 0) {
        e.preventDefault()
        setSelectedShiftIds([])
      } else if (e.key === 'Delete' && selectedShiftIds.length > 0) {
        e.preventDefault()
        if (confirm(`Delete ${selectedShiftIds.length} shift${selectedShiftIds.length > 1 ? 's' : ''}?`)) {
          selectedShiftIds.forEach((shiftId) => {
            deleteShift(shiftId).catch((err) => {
              const error = err as ShiftUpdateError
              setToast({ message: error.message, type: 'error' })
            })
          })
          setSelectedShiftIds([])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedShiftIds, deleteShift])

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
      // applyTimeToDate already returns UTC ISO strings, so we can use them directly
      let newStartTime = applyTimeToDate(targetDate, startHours, startMinutes, timezone)
      let newEndTime = applyTimeToDate(targetDate, endHours, endMinutes, timezone)

      // If end time is before start time (overnight), add 1 day to end
      if (new Date(newEndTime) < new Date(newStartTime)) {
        const endDate = addDays(targetDate, 1)
        newEndTime = applyTimeToDate(endDate, endHours, endMinutes, timezone)
      }

      // CRITICAL: Normalize time before commit
      const normalizedStart = normalizeTimeForCommit(new Date(newStartTime), timezone, 15)
      const normalizedEnd = normalizeTimeForCommit(new Date(newEndTime), timezone, 15)

      await updateShift(shiftId, {
        staff_id: targetStaffId,
        start_time: normalizedStart,
        end_time: normalizedEnd,
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
          staff_id: targetStaffId,
          start_time: normalizedStart,
          end_time: normalizedEnd,
        },
        execute: async () => {
          await updateShift(shiftId, {
            staff_id: targetStaffId,
            start_time: normalizedStart,
            end_time: normalizedEnd,
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
  }

  const handleSaveShift = async (formData: ShiftFormData) => {
    try {
      // Convert datetime-local to UTC using shared helper
      const startTime = toUtcIsoInTenantTz(new Date(formData.start_time), timezone)
      const endTime = toUtcIsoInTenantTz(new Date(formData.end_time), timezone)

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
    } catch (err) {
      const error = err as ShiftUpdateError
      if (error.code === 'OVERLAP') {
        setToast({ message: error.message, type: 'error' })
      } else if (error.code === 'FORBIDDEN') {
        setToast({ message: error.message, type: 'error' })
      } else {
        setToast({ message: error.message, type: 'error' })
      }
      throw err
    }
  }

  const handleTodayClick = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  const handleDeleteShift = async (shiftId: string) => {
    const originalShift = shifts.find((s) => s.id === shiftId)
    if (!originalShift) return

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this shift?')) {
      return
    }

    try {
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

  const handleShiftDuplicate = async (shift: Shift) => {
    try {
      await createShift({
        staff_id: shift.staff_id,
        location_id: shift.location_id,
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
  }

  const handleShiftPublish = async (shiftId: string) => {
    try {
      await updateShift(shiftId, { status: 'published' })
      setToast({ message: 'Shift published successfully', type: 'success' })
    } catch (err) {
      const error = err as ShiftUpdateError
      setToast({ message: error.message, type: 'error' })
    }
  }

  const handleShiftUnpublish = async (shiftId: string) => {
    try {
      await updateShift(shiftId, { status: 'draft' })
      setToast({ message: 'Shift unpublished successfully', type: 'success' })
    } catch (err) {
      const error = err as ShiftUpdateError
      setToast({ message: error.message, type: 'error' })
    }
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
        budgetViewActive={budgetViewActive}
        onBudgetViewToggle={setBudgetViewActive}
        canViewBudget={canViewBudget}
      />

      {/* Syncing indicator */}
      {syncing && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2 text-sm text-blue-700">
          <CloudArrowUpIcon className="h-4 w-4 animate-pulse" />
          <span>Syncing...</span>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {/* Offline Indicator */}
        {isOffline && (
          <div className="bg-yellow-500 text-white px-4 py-2 text-sm text-center">
            You're offline. Changes will sync when connection is restored.
          </div>
        )}

        {/* CRITICAL: No loading state after first paint - SWR shows cached data immediately */}
        <BudgetViewErrorBoundary>
          <StaffRowScheduler
            weekStart={currentWeek}
            shifts={shifts}
            staffList={staffList}
            timezone={timezone}
            conflicts={conflicts}
            onShiftClick={handleShiftClick}
            onContextMenu={handleShiftContextMenu}
            onCellClick={handleCellClick}
            onShiftDrop={handleShiftDrop}
            selectedShiftIds={selectedShiftIds}
            budgetViewActive={budgetViewActive && canViewBudget}
            staffHourlyRates={staffHourlyRates}
            isLoadingRates={isLoadingRates}
            staffOvertimeConfigs={staffOvertimeConfigs}
            payPeriodConfig={payPeriodConfig}
          />
        </BudgetViewErrorBoundary>
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

      {/* Context Menu */}
      {contextMenu && (
        <ShiftContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          shift={contextMenu.shift}
          onClose={() => setContextMenu(null)}
          onEdit={() => {
            setEditingShift(contextMenu.shift)
            setModalOpen(true)
            setContextMenu(null)
          }}
          onDelete={() => {
            handleDeleteShift(contextMenu.shift.id)
            setContextMenu(null)
          }}
          onDuplicate={() => {
            handleShiftDuplicate(contextMenu.shift)
            setContextMenu(null)
          }}
          onPublish={() => {
            handleShiftPublish(contextMenu.shift.id)
            setContextMenu(null)
          }}
          onUnpublish={() => {
            handleShiftUnpublish(contextMenu.shift.id)
            setContextMenu(null)
          }}
          canPublish={true}
        />
      )}
    </div>
  )
}
