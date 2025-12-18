'use client'

import { format } from 'date-fns'
import { Shift } from '../hooks/useWeekShifts'
import DayCell from './DayCell'
import RowTotalCell from './RowTotalCell'
import { addDays } from 'date-fns'
import { calculateRowTotal } from '../utils/budget-calculations'
import { useMemo } from 'react'

interface Staff {
  id: string
  first_name: string
  last_name: string
  preferred_name: string | null
  department: string | null
  location_id: string | null
  location?: {
    id: string
    name: string
  } | null
}

interface StaffRowProps {
  staff: Staff
  weekStart: Date
  timezone: string
  shiftsByDay: Map<number, Shift[]>
  conflicts?: Array<{ shift_id: string; type: string; message: string }>
  onShiftClick?: (shift: Shift) => void
  onCellClick?: (staffId: string, dayIndex: number, dayDate: Date) => void
  onDragStart?: (shift: Shift, e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, targetStaffId: string, targetDayIndex: number, targetDate: Date) => void
  budgetViewActive?: boolean
  staffHourlyRate?: number | null
  isLoadingRates?: boolean
  overtimeShiftCosts?: Map<string, {
    regularHours: number
    overtimeHours: number
    regularCost: number
    overtimeCost: number
    totalCost: number
    hasOvertime: boolean
    resolvedHourlyRate: number | null
  }>
}

export default function StaffRow({
  staff,
  weekStart,
  timezone,
  shiftsByDay,
  conflicts = [],
  onShiftClick,
  onCellClick,
  onDragStart,
  onDragEnd,
  onDrop,
  budgetViewActive = false,
  staffHourlyRate = null,
  isLoadingRates = false,
  overtimeShiftCosts = new Map(),
}: StaffRowProps) {
  // Display name: preferred_name ?? first_name ?? last_name ?? "Unnamed"
  const displayName = staff.preferred_name || staff.first_name || staff.last_name || 'Unnamed'
  const department = staff.department || ''
  const locationName = staff.location?.name || ''

  // Generate 7 days (Monday-Sunday)
  const days = Array.from({ length: 7 }, (_, i) => {
    const dayDate = addDays(weekStart, i)
    return { dayIndex: i, dayDate }
  })

  // Calculate row total for budget view (with overtime if available)
  const allStaffShifts = Array.from(shiftsByDay.values()).flat()
  const rowTotal = useMemo(() => {
    if (!budgetViewActive) return 0
    
    // Use overtime costs if available
    if (overtimeShiftCosts.size > 0) {
      return allStaffShifts.reduce((sum, shift) => {
        const cost = overtimeShiftCosts.get(shift.id)
        return sum + (cost?.totalCost || 0)
      }, 0)
    }
    
    // Fallback to basic calculation
    return calculateRowTotal(allStaffShifts, staffHourlyRate)
  }, [budgetViewActive, allStaffShifts, overtimeShiftCosts, staffHourlyRate])

  return (
    <div className="flex border-b border-gray-200">
      {/* Sticky staff column */}
      <div className="sticky left-0 z-10 w-48 flex-shrink-0 border-r border-gray-200 bg-white p-2">
        <div className="font-semibold text-sm truncate" title={displayName}>
          {displayName}
        </div>
        {(department || locationName) && (
          <div className="text-xs text-gray-500 truncate" title={`${department}${department && locationName ? ' • ' : ''}${locationName}`}>
            {department}{department && locationName ? ' • ' : ''}{locationName}
          </div>
        )}
      </div>

      {/* Day cells */}
      {days.map(({ dayIndex, dayDate }) => {
        const dayShifts = shiftsByDay.get(dayIndex) || []
        const dayOvertimeCosts = new Map<string, any>()
        dayShifts.forEach(shift => {
          const cost = overtimeShiftCosts.get(shift.id)
          if (cost) {
            dayOvertimeCosts.set(shift.id, cost)
          }
        })
        
        return (
          <DayCell
            key={dayIndex}
            staffId={staff.id}
            dayIndex={dayIndex}
            dayDate={dayDate}
            shifts={dayShifts}
            timezone={timezone}
            conflicts={conflicts}
            onShiftClick={onShiftClick}
            onCellClick={onCellClick}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
            budgetViewActive={budgetViewActive}
            staffHourlyRate={staffHourlyRate}
            isLoadingRates={isLoadingRates}
            overtimeShiftCosts={dayOvertimeCosts}
          />
        )
      })}
      
      {/* Row total cell */}
      {budgetViewActive && (
        <RowTotalCell
          totalCost={rowTotal}
          hasData={allStaffShifts.length > 0}
          isLoading={isLoadingRates}
        />
      )}
    </div>
  )
}

