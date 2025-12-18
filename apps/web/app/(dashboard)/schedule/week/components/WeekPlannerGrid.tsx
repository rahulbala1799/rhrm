'use client'

import { startOfWeek, addDays, format, eachHourOfInterval, startOfDay, endOfDay } from 'date-fns'
import { Shift } from '../hooks/useWeekShifts'
import DayColumn from './DayColumn'
import ShiftBlock from './ShiftBlock'

interface WeekPlannerGridProps {
  weekStart: Date
  shifts: Shift[]
  timezone: string
  onShiftClick?: (shift: Shift) => void
  onShiftDrop?: (shiftId: string, newDay: Date, newTime: string) => void
}

export default function WeekPlannerGrid({
  weekStart,
  shifts,
  timezone,
  onShiftClick,
  onShiftDrop,
}: WeekPlannerGridProps) {
  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 }) // Monday
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i))

  // Generate time slots (6 AM to 11 PM, 30-minute intervals)
  const startHour = 6
  const endHour = 23
  const timeSlots: string[] = []
  
  for (let hour = startHour; hour <= endHour; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`)
    if (hour < endHour) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
  }

  // Group shifts by day
  const shiftsByDay = days.reduce((acc, day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    acc[dayStr] = shifts.filter((shift) => {
      const shiftDate = new Date(shift.start_time)
      const shiftDayStr = format(shiftDate, 'yyyy-MM-dd')
      return shiftDayStr === dayStr
    })
    return acc
  }, {} as Record<string, Shift[]>)

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-full inline-block">
        {/* Time column header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex">
            <div className="w-24 flex-shrink-0 border-r border-gray-200 p-2">
              <div className="text-xs font-medium text-gray-500">Time</div>
            </div>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className="flex-1 border-r border-gray-200 last:border-r-0 p-2"
              >
                <div className="text-xs font-medium text-gray-500">
                  {format(day, 'EEE')}
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {format(day, 'MMM d')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex">
          {/* Time column */}
          <div className="w-24 flex-shrink-0 border-r border-gray-200">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="h-16 border-b border-gray-100 p-2"
              >
                <div className="text-xs text-gray-500">{time}</div>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayShifts = shiftsByDay[dayStr] || []

            return (
              <DayColumn
                key={day.toISOString()}
                day={day}
                shifts={dayShifts}
                timeSlots={timeSlots}
                timezone={timezone}
                onShiftClick={onShiftClick}
                onShiftDrop={onShiftDrop}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}


