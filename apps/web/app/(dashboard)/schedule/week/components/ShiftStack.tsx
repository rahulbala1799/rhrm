'use client'

import { Shift } from '@/lib/schedule/types'
import ShiftBlock from './ShiftBlock'
import OvernightContinuationBlock from './OvernightContinuationBlock'
import { isOvernight, getOvernightContinuationDay } from '@/lib/schedule/timezone-utils'
import { getDayOfWeekInTimezone } from '@/lib/schedule/timezone-utils'
import { formatTimeInTimezone } from '@/lib/schedule/timezone-utils'

interface ShiftStackProps {
  shifts: Shift[]
  dayIndex: number
  timezone: string
  conflicts?: Array<{ shift_id: string; type: string; message: string }>
  onShiftClick?: (shift: Shift) => void
  onDragStart?: (shift: Shift, e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onContextMenu?: (shift: Shift, e: React.MouseEvent) => void
  selectedShiftIds?: string[]
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

export default function ShiftStack({
  shifts,
  dayIndex,
  timezone,
  conflicts = [],
  onShiftClick,
  onDragStart,
  onDragEnd,
  onContextMenu,
  selectedShiftIds = [],
  budgetViewActive = false,
  staffHourlyRate = null,
  isLoadingRates = false,
  overtimeShiftCosts = new Map(),
}: ShiftStackProps) {
  // Sort by start time (ascending)
  const sortedShifts = [...shifts].sort((a, b) => {
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  })

  if (sortedShifts.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-1 min-h-[60px] max-h-[200px] overflow-y-auto">
      {sortedShifts.map((shift) => {
        const shiftIsOvernight = isOvernight({ start_time: shift.start_time, end_time: shift.end_time }, timezone)
        const startDay = getDayOfWeekInTimezone(shift.start_time, timezone)
        const continuationDay = getOvernightContinuationDay({ start_time: shift.start_time, end_time: shift.end_time }, timezone)
        const needsGhost = shiftIsOvernight && continuationDay !== null && continuationDay === dayIndex && continuationDay !== startDay

        return (
          <div key={shift.id}>
            <ShiftBlock
              shift={shift}
              timezone={timezone}
              conflicts={conflicts}
              isOvernight={shiftIsOvernight}
              onClick={() => onShiftClick?.(shift)}
              onDragStart={(e) => onDragStart?.(shift, e)}
              onDragEnd={onDragEnd}
              onContextMenu={(e) => onContextMenu?.(shift, e)}
              isSelected={selectedShiftIds.includes(shift.id)}
              budgetViewActive={budgetViewActive}
              staffHourlyRate={staffHourlyRate}
              isLoadingRates={isLoadingRates}
              overtimeCost={overtimeShiftCosts.get(shift.id)}
            />
            {needsGhost && (
              <OvernightContinuationBlock
                shift={shift}
                timezone={timezone}
                onClick={() => onShiftClick?.(shift)}
                onDragStart={(e) => onDragStart?.(shift, e)}
                onDragEnd={onDragEnd}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

