'use client'

import { useMemo } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { Shift } from '../hooks/useWeekShifts'
import StaffRow from './StaffRow'
import { groupShiftsByStaffAndDay } from '@/lib/schedule/shift-grouping'

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

interface StaffRowSchedulerProps {
  weekStart: Date
  shifts: Shift[]
  staffList: Staff[]
  timezone: string
  conflicts?: Array<{ shift_id: string; type: string; message: string }>
  onShiftClick?: (shift: Shift) => void
  onCellClick?: (staffId: string, dayIndex: number, dayDate: Date) => void
  onShiftDrop?: (
    shiftId: string,
    targetStaffId: string,
    targetDayIndex: number,
    targetDate: Date
  ) => void
}

export default function StaffRowScheduler({
  weekStart,
  shifts,
  staffList,
  timezone,
  conflicts = [],
  onShiftClick,
  onCellClick,
  onShiftDrop,
}: StaffRowSchedulerProps) {
  // Group shifts by staff and day
  const groupedShifts = useMemo(() => {
    return groupShiftsByStaffAndDay(shifts, timezone, weekStart)
  }, [shifts, timezone, weekStart])

  // Sort staff: A-Z by preferred_name else first_name (case-insensitive)
  const sortedStaff = useMemo(() => {
    return [...staffList].sort((a, b) => {
      const aName = (a.preferred_name || a.first_name || a.last_name || '').toLowerCase()
      const bName = (b.preferred_name || b.first_name || b.last_name || '').toLowerCase()
      return aName.localeCompare(bName)
    })
  }, [staffList])

  // Generate day headers (Monday-Sunday)
  const dayHeaders = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = addDays(weekStart, i)
      return {
        dayIndex: i,
        dayDate,
        dayName: format(dayDate, 'EEE'),
        dayNumber: format(dayDate, 'd'),
        monthName: format(dayDate, 'MMM'),
      }
    })
  }, [weekStart])

  const handleDragStart = (shift: Shift, e: React.DragEvent) => {
    // Set drag data
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify({
      shiftId: shift.id,
      staffId: shift.staff_id,
      startTime: shift.start_time,
      endTime: shift.end_time,
    }))
  }

  const handleDrop = (
    e: React.DragEvent,
    targetStaffId: string,
    targetDayIndex: number,
    targetDate: Date
  ) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'))
      const shiftId = dragData.shiftId
      
      // Call the parent handler - it will compute the new times
      onShiftDrop?.(shiftId, targetStaffId, targetDayIndex, targetDate)
    } catch (err) {
      console.error('Error handling drop:', err)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex">
          {/* Staff column header */}
          <div className="sticky left-0 z-10 w-48 flex-shrink-0 border-r border-gray-200 bg-white p-2">
            <div className="text-xs font-medium text-gray-500">Staff</div>
          </div>

          {/* Day headers */}
          {dayHeaders.map(({ dayIndex, dayName, dayNumber, monthName }) => (
            <div
              key={dayIndex}
              className="flex-1 border-r border-gray-200 last:border-r-0 p-2 text-center"
            >
              <div className="text-xs font-medium text-gray-500">{dayName}</div>
              <div className="text-sm font-semibold text-gray-900">
                {monthName} {dayNumber}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable grid body */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          {sortedStaff.map((staff) => {
            const staffShiftsByDay = groupedShifts.get(staff.id) || new Map<number, Shift[]>()
            return (
              <StaffRow
                key={staff.id}
                staff={staff}
                weekStart={weekStart}
                timezone={timezone}
                shiftsByDay={staffShiftsByDay}
                conflicts={conflicts}
                onShiftClick={onShiftClick}
                onCellClick={onCellClick}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

