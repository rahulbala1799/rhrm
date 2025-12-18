'use client'

import { Shift } from '../hooks/useWeekShifts'
import ShiftStack from './ShiftStack'

interface DayCellProps {
  staffId: string
  dayIndex: number
  dayDate: Date
  shifts: Shift[]
  timezone: string
  conflicts?: Array<{ shift_id: string; type: string; message: string }>
  onShiftClick?: (shift: Shift) => void
  onCellClick?: (staffId: string, dayIndex: number, dayDate: Date) => void
  onDragStart?: (shift: Shift, e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, targetStaffId: string, targetDayIndex: number, targetDate: Date) => void
}

export default function DayCell({
  staffId,
  dayIndex,
  dayDate,
  shifts,
  timezone,
  conflicts = [],
  onShiftClick,
  onCellClick,
  onDragStart,
  onDragEnd,
  onDrop,
}: DayCellProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDrop?.(e, staffId, dayIndex, dayDate)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      className="flex-1 border-r border-b border-gray-200 last:border-r-0 p-1 min-h-[120px] bg-white hover:bg-gray-50 transition-colors"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => onCellClick?.(staffId, dayIndex, dayDate)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onCellClick?.(staffId, dayIndex, dayDate)
        }
      }}
      aria-label={`Cell for day ${dayIndex}`}
    >
      <ShiftStack
        shifts={shifts}
        dayIndex={dayIndex}
        timezone={timezone}
        conflicts={conflicts}
        onShiftClick={onShiftClick}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    </div>
  )
}

