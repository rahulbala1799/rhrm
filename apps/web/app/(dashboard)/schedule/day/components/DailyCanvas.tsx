'use client'

import { useMemo } from 'react'
import { format, toZonedTime } from 'date-fns-tz'
import { Shift } from '../hooks/useDayShifts'
import ShiftBlock from './ShiftBlock'

interface DailyCanvasProps {
  date: Date
  shifts: Shift[]
  staffList: Array<{
    id: string
    first_name: string
    last_name: string
    preferred_name: string | null
    department: string | null
    location_id: string | null
    location?: { id: string; name: string } | null
  }>
  timezone: string
  conflicts?: Array<{ shift_id: string; type: string; message: string }>
  onShiftClick?: (shift: Shift) => void
  onCellClick?: (staffId: string, time: string) => void
  onDeleteShift?: (shiftId: string) => void
}

// Time slots: 6 AM to 11 PM, 30-minute intervals
const START_HOUR = 6
const END_HOUR = 23
const TIME_SLOTS: string[] = []
for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`)
  if (hour < END_HOUR) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:30`)
  }
}

export default function DailyCanvas({
  date,
  shifts,
  staffList,
  timezone,
  conflicts = [],
  onShiftClick,
  onCellClick,
  onDeleteShift,
}: DailyCanvasProps) {
  // Group shifts by staff
  const shiftsByStaff = useMemo(() => {
    const grouped = new Map<string, Shift[]>()
    shifts.forEach((shift) => {
      if (!grouped.has(shift.staff_id)) {
        grouped.set(shift.staff_id, [])
      }
      grouped.get(shift.staff_id)!.push(shift)
    })
    return grouped
  }, [shifts])

  // Sort staff by name
  const sortedStaff = useMemo(() => {
    return [...staffList].sort((a, b) => {
      const nameA = (a.preferred_name || a.first_name || a.last_name || '').toLowerCase()
      const nameB = (b.preferred_name || b.first_name || b.last_name || '').toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }, [staffList])

  // Get shifts for a staff member at a specific time slot
  const getShiftsAtTime = (staffId: string, timeSlot: string): Shift[] => {
    const staffShifts = shiftsByStaff.get(staffId) || []
    const [hour, minute] = timeSlot.split(':').map(Number)
    const slotTime = new Date(date)
    slotTime.setHours(hour, minute, 0, 0)
    const slotStart = slotTime.getTime()
    const slotEnd = slotTime.getTime() + 30 * 60 * 1000 // 30 minutes

    return staffShifts.filter((shift) => {
      const shiftStart = new Date(shift.start_time).getTime()
      const shiftEnd = new Date(shift.end_time).getTime()
      // Check if shift overlaps with time slot
      return shiftStart < slotEnd && shiftEnd > slotStart
    })
  }

  // Calculate shift position and width for a time slot
  const getShiftPosition = (shift: Shift, timeSlot: string): { left: number; width: number } | null => {
    const [hour, minute] = timeSlot.split(':').map(Number)
    const slotTime = new Date(date)
    slotTime.setHours(hour, minute, 0, 0)
    const slotStart = slotTime.getTime()
    const slotEnd = slotTime.getTime() + 30 * 60 * 1000

    const shiftStart = new Date(shift.start_time).getTime()
    const shiftEnd = new Date(shift.end_time).getTime()

    // Check if shift overlaps with this slot
    if (shiftStart >= slotEnd || shiftEnd <= slotStart) {
      return null
    }

    // Calculate position within slot
    const overlapStart = Math.max(shiftStart, slotStart)
    const overlapEnd = Math.min(shiftEnd, slotEnd)
    const overlapDuration = overlapEnd - overlapStart
    const slotDuration = slotEnd - slotStart

    const left = ((overlapStart - slotStart) / slotDuration) * 100
    const width = (overlapDuration / slotDuration) * 100

    return { left, width }
  }

  return (
    <div className="flex h-full overflow-auto">
      <div className="flex min-w-full">
        {/* Staff Column */}
        <div className="sticky left-0 z-20 w-48 border-r border-gray-200 bg-white">
          <div className="sticky top-0 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
            Staff
          </div>
          {sortedStaff.map((staff) => {
            const displayName = staff.preferred_name || staff.first_name || staff.last_name || 'Unnamed'
            return (
              <div
                key={staff.id}
                className="flex h-16 items-center border-b border-gray-100 px-3"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{displayName}</div>
                  {staff.department && (
                    <div className="text-xs text-gray-500">{staff.department}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Time Grid */}
        <div className="flex-1">
          {/* Time Header */}
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
            <div className="flex">
              {TIME_SLOTS.map((time) => (
                <div
                  key={time}
                  className="w-24 border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-500"
                >
                  {time}
                </div>
              ))}
            </div>
          </div>

          {/* Staff Rows */}
          <div>
            {sortedStaff.map((staff) => (
              <div key={staff.id} className="flex border-b border-gray-100">
                {TIME_SLOTS.map((timeSlot) => {
                  const shiftsAtTime = getShiftsAtTime(staff.id, timeSlot)
                  const isFirstSlot = shiftsAtTime.some((s) => {
                    const shiftStart = toZonedTime(new Date(s.start_time), timezone)
                    const slotTime = new Date(date)
                    const [hour, minute] = timeSlot.split(':').map(Number)
                    slotTime.setHours(hour, minute, 0, 0)
                    return (
                      shiftStart.getHours() === slotTime.getHours() &&
                      shiftStart.getMinutes() === slotTime.getMinutes()
                    )
                  })

                  return (
                    <div
                      key={`${staff.id}-${timeSlot}`}
                      className="relative h-16 w-24 border-r border-gray-100"
                      onClick={() => onCellClick?.(staff.id, timeSlot)}
                      role="button"
                      tabIndex={0}
                    >
                      {isFirstSlot &&
                        shiftsAtTime.map((shift) => {
                          const position = getShiftPosition(shift, timeSlot)
                          if (!position) return null

                          return (
                            <div
                              key={shift.id}
                              className="absolute top-0 h-full"
                              style={{
                                left: `${position.left}%`,
                                width: `${position.width}%`,
                              }}
                            >
                              <ShiftBlock
                                shift={shift}
                                timezone={timezone}
                                conflicts={conflicts}
                                onClick={() => onShiftClick?.(shift)}
                              />
                            </div>
                          )
                        })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

