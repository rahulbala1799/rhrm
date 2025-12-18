'use client'

import { format } from 'date-fns'
import { Shift } from '../hooks/useWeekShifts'
import DayCell from './DayCell'
import RowTotalCell from './RowTotalCell'
import { addDays } from 'date-fns'
import { calculateRowTotal } from '../utils/budget-calculations'

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

  // Calculate row total for budget view
  const allStaffShifts = Array.from(shiftsByDay.values()).flat()
  const rowTotal = budgetViewActive ? calculateRowTotal(allStaffShifts, staffHourlyRate) : 0

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
      {days.map(({ dayIndex, dayDate }) => (
        <DayCell
          key={dayIndex}
          staffId={staff.id}
          dayIndex={dayIndex}
          dayDate={dayDate}
          shifts={shiftsByDay.get(dayIndex) || []}
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
        />
      ))}
      
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

