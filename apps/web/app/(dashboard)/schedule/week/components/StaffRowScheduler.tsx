'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { FixedSizeList } from 'react-window'
import { Shift } from '@/lib/schedule/types'
import StaffRow from './StaffRow'
import ColumnTotalsRow from './ColumnTotalsRow'
import { groupShiftsByStaffAndDay } from '@/lib/schedule/shift-grouping'
import { calculateColumnTotal, calculateGrandTotal } from '../utils/budget-calculations'
import { getDayOfWeekInTimezone } from '@/lib/schedule/timezone-utils'
import { useOvertimeCalculations } from '../hooks/useOvertimeCalculations'

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
  onShiftClick?: (shift: Shift, e?: React.MouseEvent) => void
  onContextMenu?: (shift: Shift, e: React.MouseEvent) => void
  onCellClick?: (staffId: string, dayIndex: number, dayDate: Date) => void
  onShiftDrop?: (
    shiftId: string,
    targetStaffId: string,
    targetDayIndex: number,
    targetDate: Date
  ) => void
  selectedShiftIds?: string[]
  budgetViewActive?: boolean
  staffHourlyRates?: Map<string, number | null>
  isLoadingRates?: boolean
  staffOvertimeConfigs?: Map<string, {
    contractedWeeklyHours: number | null
    overtimeEnabled: boolean | null
    overtimeRuleType: 'multiplier' | 'flat_extra' | null
    overtimeMultiplier: number | null
    overtimeFlatExtra: number | null
    payFrequency: 'weekly' | 'fortnightly' | 'monthly' | null
  }>
  payPeriodConfig?: any
}

export default function StaffRowScheduler({
  weekStart,
  shifts,
  staffList,
  timezone,
  conflicts = [],
  onShiftClick,
  onContextMenu,
  onCellClick,
  onShiftDrop,
  selectedShiftIds = [],
  budgetViewActive = false,
  staffHourlyRates = new Map(),
  isLoadingRates = false,
  staffOvertimeConfigs = new Map(),
  payPeriodConfig = null,
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

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(600)

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight)
      }
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Calculate costs using rate history (for salary increases) and overtime if budget view is active
  // This hook fetches rate history and calculates costs per shift using the rate effective on that shift's date
  const { shiftCosts: overtimeShiftCosts, rateHistory } = useOvertimeCalculations({
    shifts,
    staffList,
    staffOvertimeConfigs,
    payPeriodConfig,
    timezone,
    weekStart,
    budgetViewActive,
  })

  // Calculate column totals and grand total for budget view (with overtime if available)
  const { dayTotals, grandTotal } = useMemo(() => {
    if (!budgetViewActive) {
      return { dayTotals: [0, 0, 0, 0, 0, 0, 0], grandTotal: 0 }
    }

    // Use overtime costs if available, otherwise fall back to basic calculations
    if (overtimeShiftCosts.size > 0) {
      const totals = Array.from({ length: 7 }, (_, dayIndex) => {
        const dayShifts = shifts.filter(shift => {
          const day = getDayOfWeekInTimezone(shift.start_time, timezone)
          return day === dayIndex
        })
        return dayShifts.reduce((sum, shift) => {
          const cost = overtimeShiftCosts.get(shift.id)
          return sum + (cost?.totalCost || 0)
        }, 0)
      })

      const total = Array.from(overtimeShiftCosts.values()).reduce(
        (sum, cost) => sum + (cost.totalCost || 0),
        0
      )
      return { dayTotals: totals, grandTotal: total }
    }

    // Fallback to basic calculations
    const totals = Array.from({ length: 7 }, (_, dayIndex) => {
      const dayShifts = shifts.filter(shift => {
        const day = getDayOfWeekInTimezone(shift.start_time, timezone)
        return day === dayIndex
      })
      return calculateColumnTotal(dayShifts, staffHourlyRates)
    })

    const total = calculateGrandTotal(shifts, staffHourlyRates)
    return { dayTotals: totals, grandTotal: total }
  }, [budgetViewActive, shifts, staffHourlyRates, timezone, overtimeShiftCosts])

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
          
          {/* Budget totals column header */}
          {budgetViewActive && (
            <div className="sticky right-0 z-10 w-24 flex-shrink-0 border-l border-gray-200 bg-white p-2 text-center">
              <div className="text-xs font-medium text-gray-500">Total</div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable grid body - Virtualized if staff > 50 */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        {sortedStaff.length > 50 ? (
          <FixedSizeList
            height={containerHeight}
            itemCount={sortedStaff.length + (budgetViewActive ? 1 : 0)}
            itemSize={60}
            width="100%"
            className="virtualized-list"
          >
            {({ index, style }) => {
              if (budgetViewActive && index === sortedStaff.length) {
                return (
                  <div style={style}>
                    <ColumnTotalsRow
                      weekStart={weekStart}
                      dayTotals={dayTotals}
                      grandTotal={grandTotal}
                      isLoading={isLoadingRates}
                    />
                  </div>
                )
              }
              const staff = sortedStaff[index]
              const staffShiftsByDay = groupedShifts.get(staff.id) || new Map<number, Shift[]>()
              const allStaffShifts = Array.from(staffShiftsByDay.values()).flat()
              return (
                <div style={style}>
                  <StaffRow
                    key={staff.id}
                    staff={staff}
                    weekStart={weekStart}
                    timezone={timezone}
                    shiftsByDay={staffShiftsByDay}
                    conflicts={conflicts}
                    onShiftClick={onShiftClick}
                    onContextMenu={onContextMenu}
                    onCellClick={onCellClick}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    selectedShiftIds={selectedShiftIds}
                    budgetViewActive={budgetViewActive}
                    staffHourlyRate={staffHourlyRates.get(staff.id) ?? null}
                    isLoadingRates={isLoadingRates}
                    overtimeShiftCosts={budgetViewActive ? overtimeShiftCosts : new Map()}
                  />
                </div>
              )
            }}
          </FixedSizeList>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="min-w-full">
              {sortedStaff.map((staff) => {
                const staffShiftsByDay = groupedShifts.get(staff.id) || new Map<number, Shift[]>()
                const allStaffShifts = Array.from(staffShiftsByDay.values()).flat()
                return (
                  <StaffRow
                    key={staff.id}
                    staff={staff}
                    weekStart={weekStart}
                    timezone={timezone}
                    shiftsByDay={staffShiftsByDay}
                    conflicts={conflicts}
                    onShiftClick={onShiftClick}
                    onContextMenu={onContextMenu}
                    onCellClick={onCellClick}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    selectedShiftIds={selectedShiftIds}
                    budgetViewActive={budgetViewActive}
                    staffHourlyRate={staffHourlyRates.get(staff.id) ?? null}
                    isLoadingRates={isLoadingRates}
                    overtimeShiftCosts={budgetViewActive ? overtimeShiftCosts : new Map()}
                  />
                )
              })}
              
              {/* Column totals row */}
              {budgetViewActive && (
                <ColumnTotalsRow
                  weekStart={weekStart}
                  dayTotals={dayTotals}
                  grandTotal={grandTotal}
                  isLoading={isLoadingRates}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

