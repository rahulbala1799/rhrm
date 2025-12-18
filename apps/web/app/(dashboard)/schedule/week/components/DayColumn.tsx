'use client'

import { format, parseISO } from 'date-fns'
import { Shift } from '../hooks/useWeekShifts'
import ShiftBlock from './ShiftBlock'

interface DayColumnProps {
  day: Date
  shifts: Shift[]
  timeSlots: string[]
  timezone: string
  onShiftClick?: (shift: Shift) => void
  onShiftDrop?: (shiftId: string, newDay: Date, newTime: string) => void
}

export default function DayColumn({
  day,
  shifts,
  timeSlots,
  timezone,
  onShiftClick,
  onShiftDrop,
}: DayColumnProps) {
  // Calculate position and height for each shift
  const getShiftPosition = (shift: Shift) => {
    const startTime = new Date(shift.start_time)
    const endTime = new Date(shift.end_time)
    
    // Convert to local time for display
    const startHour = startTime.getHours()
    const startMinute = startTime.getMinutes()
    const endHour = endTime.getHours()
    const endMinute = endTime.getMinutes()

    // Calculate position (each time slot is 64px = 4rem)
    const slotHeight = 64 // 4rem = 64px
    const startSlot = (startHour - 6) * 2 + (startMinute >= 30 ? 1 : 0)
    const endSlot = (endHour - 6) * 2 + (endMinute >= 30 ? 1 : 0)
    const duration = endSlot - startSlot

    const top = startSlot * slotHeight
    const height = duration * slotHeight

    return { top, height, startSlot, endSlot }
  }

  return (
    <div className="flex-1 border-r border-gray-200 last:border-r-0 relative">
      {/* Time slots */}
      {timeSlots.map((time) => (
        <div
          key={time}
          className="h-16 border-b border-gray-100"
        />
      ))}

      {/* Shift blocks */}
      {shifts.map((shift) => {
        const position = getShiftPosition(shift)
        
        return (
          <ShiftBlock
            key={shift.id}
            shift={shift}
            style={{
              position: 'absolute',
              top: `${position.top}px`,
              height: `${position.height}px`,
              left: '4px',
              right: '4px',
            }}
            onClick={() => onShiftClick?.(shift)}
          />
        )
      })}
    </div>
  )
}

