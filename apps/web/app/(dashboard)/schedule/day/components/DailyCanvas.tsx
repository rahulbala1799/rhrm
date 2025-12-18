'use client'

import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { format, toZonedTime, fromZonedTime } from 'date-fns-tz'
import { Shift } from '../hooks/useDayShifts'
import ShiftBlock from './ShiftBlock'
import { applyTimeToDate } from '@/lib/schedule/timezone-utils'

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
  onShiftCreate?: (staffId: string, startTime: Date, endTime: Date) => void
  onShiftMove?: (shiftId: string, newStaffId: string, newStartTime: Date, newEndTime: Date) => void
  onShiftResize?: (shiftId: string, newStartTime: Date, newEndTime: Date) => void
  snapEnabled?: boolean
  selectedShiftIds?: string[]
  onSelectionChange?: (shiftIds: string[]) => void
}

// Time slots: 6 AM to 11 PM, 15-minute intervals
const START_HOUR = 6
const END_HOUR = 23
const MINUTES_PER_SLOT = 15
const SLOTS_PER_HOUR = 60 / MINUTES_PER_SLOT

// Generate time slots
const TIME_SLOTS: string[] = []
for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
  for (let slot = 0; slot < SLOTS_PER_HOUR; slot++) {
    const minutes = slot * MINUTES_PER_SLOT
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`)
  }
}

// Staff row height in pixels
const STAFF_ROW_HEIGHT = 60

export default function DailyCanvas({
  date,
  shifts,
  staffList,
  timezone,
  conflicts = [],
  onShiftClick,
  onCellClick,
  onDeleteShift,
  onShiftCreate,
  onShiftMove,
  onShiftResize,
  snapEnabled = true,
  selectedShiftIds = [],
  onSelectionChange,
}: DailyCanvasProps) {
  const [draggingShift, setDraggingShift] = useState<{
    shiftId: string
    startX: number
    startY: number
    originalStart: Date
    originalEnd: Date
    originalStaffId: string
  } | null>(null)
  const [resizingShift, setResizingShift] = useState<{
    shiftId: string
    edge: 'left' | 'right'
    startX: number
    originalStart: Date
    originalEnd: Date
  } | null>(null)
  const [creatingShift, setCreatingShift] = useState<{
    staffId: string
    startX: number
    startTime: Date
  } | null>(null)
  const [dragPreview, setDragPreview] = useState<{
    staffId: string
    startTime: Date
    endTime: Date
    isValid: boolean
    reason?: string
  } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Group shifts by staff
  const shiftsByStaff = useMemo(() => {
    const grouped = new Map<string, Shift[]>()
    shifts.forEach((shift) => {
      if (!grouped.has(shift.staff_id)) {
        grouped.set(shift.staff_id, [])
      }
      grouped.get(shift.staff_id)!.push(shift)
    })
    // Sort shifts by start time
    grouped.forEach((staffShifts) => {
      staffShifts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
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

  // Convert pixel X position to time (24px per 15-minute slot)
  const pixelToTime = useCallback((pixelX: number): Date => {
    const slotWidth = 24 // 24px per 15-minute slot
    const slotIndex = Math.floor(pixelX / slotWidth)
    const clampedIndex = Math.max(0, Math.min(slotIndex, TIME_SLOTS.length - 1))
    const [hour, minute] = TIME_SLOTS[clampedIndex].split(':').map(Number)
    const targetDate = new Date(date)
    targetDate.setHours(hour, minute, 0, 0)
    return fromZonedTime(targetDate, timezone)
  }, [date, timezone])

  // Convert time to pixel X position (24px per 15-minute slot)
  const timeToPixel = useCallback((time: Date): number => {
    const localTime = toZonedTime(time, timezone)
    const hours = localTime.getHours()
    const minutes = localTime.getMinutes()
    const totalMinutes = (hours - START_HOUR) * 60 + minutes
    const slotIndex = totalMinutes / MINUTES_PER_SLOT
    const slotWidth = 24
    return slotIndex * slotWidth
  }, [timezone])

  // Snap time to grid
  const snapTime = useCallback((time: Date): Date => {
    if (!snapEnabled) return time
    const localTime = toZonedTime(time, timezone)
    const minutes = localTime.getMinutes()
    const snappedMinutes = Math.round(minutes / MINUTES_PER_SLOT) * MINUTES_PER_SLOT
    const snapped = new Date(localTime)
    snapped.setMinutes(snappedMinutes, 0, 0)
    return fromZonedTime(snapped, timezone)
  }, [snapEnabled, timezone])

  // Check for overlaps
  const checkOverlap = useCallback((staffId: string, startTime: Date, endTime: Date, excludeShiftId?: string): { hasOverlap: boolean; reason?: string } => {
    const staffShifts = shiftsByStaff.get(staffId) || []
    for (const shift of staffShifts) {
      if (excludeShiftId && shift.id === excludeShiftId) continue
      if (shift.status === 'cancelled') continue

      const shiftStart = new Date(shift.start_time)
      const shiftEnd = new Date(shift.end_time)

      // Check overlap: start1 < end2 AND start2 < end1 (inclusive start, exclusive end)
      if (startTime < shiftEnd && shiftStart < endTime) {
        const overlapStart = new Date(Math.max(startTime.getTime(), shiftStart.getTime()))
        const overlapEnd = new Date(Math.min(endTime.getTime(), shiftEnd.getTime()))
        const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)
        
        if (overlapMinutes > 0) {
          const startStr = format(toZonedTime(shiftStart, timezone), 'HH:mm')
          const endStr = format(toZonedTime(shiftEnd, timezone), 'HH:mm')
          return { hasOverlap: true, reason: `overlaps ${startStr}–${endStr}` }
        }
      }
    }
    return { hasOverlap: false }
  }, [shiftsByStaff, timezone])

  // Handle mouse down on canvas (for creating shifts)
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent, staffId: string, timeSlot: string) => {
    if (e.button !== 0) return // Only left click
    if (draggingShift || resizingShift) return

    const [hour, minute] = timeSlot.split(':').map(Number)
    const startTime = new Date(date)
    startTime.setHours(hour, minute, 0, 0)
    const snappedStart = snapTime(fromZonedTime(startTime, timezone))

    setCreatingShift({
      staffId,
      startX: e.clientX,
      startTime: snappedStart,
    })
  }, [date, snapTime, timezone, draggingShift, resizingShift])

  // Handle mouse move
  useEffect(() => {
    if (!creatingShift && !draggingShift && !resizingShift) return

    const handleMouseMove = (e: MouseEvent) => {
      if (creatingShift) {
        const deltaX = e.clientX - creatingShift.startX
        const slotWidth = 24
        const slots = Math.max(1, Math.round(deltaX / slotWidth))
        const endTime = new Date(creatingShift.startTime)
        endTime.setMinutes(endTime.getMinutes() + slots * MINUTES_PER_SLOT)

        // Clip at midnight
        const midnight = new Date(date)
        midnight.setHours(23, 59, 59, 999)
        const clippedEnd = endTime > midnight ? midnight : endTime

        const snappedEnd = snapTime(fromZonedTime(clippedEnd, timezone))
        const overlap = checkOverlap(creatingShift.staffId, creatingShift.startTime, snappedEnd)

        setDragPreview({
          staffId: creatingShift.staffId,
          startTime: creatingShift.startTime,
          endTime: snappedEnd,
          isValid: !overlap.hasOverlap,
          reason: overlap.reason,
        })
      } else if (draggingShift) {
        const deltaX = e.clientX - draggingShift.startX
        const deltaY = e.clientY - draggingShift.startY
        const shiftHeight = STAFF_ROW_HEIGHT

        // Find target staff row
        const targetStaffIndex = Math.round(deltaY / shiftHeight)
        const staffIndex = sortedStaff.findIndex(s => s.id === draggingShift.originalStaffId)
        const newStaffIndex = staffIndex + targetStaffIndex
        const targetStaff = newStaffIndex >= 0 && newStaffIndex < sortedStaff.length
          ? sortedStaff[newStaffIndex]
          : sortedStaff[staffIndex]

        // Check if Shift key is held for staff change
        const isShiftKeyHeld = e.shiftKey
        const canChangeStaff = isShiftKeyHeld && targetStaff.id !== draggingShift.originalStaffId

        // Calculate new time based on pixel delta
        const slotWidth = 24
        const slots = Math.round(deltaX / slotWidth)
        const minutesDelta = slots * MINUTES_PER_SLOT
        const newStart = new Date(draggingShift.originalStart)
        newStart.setMinutes(newStart.getMinutes() + minutesDelta)
        const duration = draggingShift.originalEnd.getTime() - draggingShift.originalStart.getTime()
        const newEnd = new Date(newStart.getTime() + duration)

        // Clip at midnight
        const midnight = new Date(date)
        midnight.setHours(23, 59, 59, 999)
        const clippedEnd = newEnd > midnight ? midnight : newEnd
        const clippedStart = clippedEnd.getTime() - duration < date.getTime()
          ? new Date(date.getTime())
          : new Date(clippedEnd.getTime() - duration)

        const snappedStart = snapTime(fromZonedTime(clippedStart, timezone))
        const snappedEnd = snapTime(fromZonedTime(clippedEnd, timezone))

        const finalStaffId = canChangeStaff ? targetStaff.id : draggingShift.originalStaffId
        const overlap = checkOverlap(finalStaffId, snappedStart, snappedEnd, draggingShift.shiftId)

        setDragPreview({
          staffId: finalStaffId,
          startTime: snappedStart,
          endTime: snappedEnd,
          isValid: !overlap.hasOverlap,
          reason: overlap.reason,
        })
      } else if (resizingShift) {
        const deltaX = e.clientX - resizingShift.startX
        const slotWidth = 24
        const slots = Math.round(deltaX / slotWidth)
        const minutesDelta = slots * MINUTES_PER_SLOT

        let newStart = new Date(resizingShift.originalStart)
        let newEnd = new Date(resizingShift.originalEnd)

        if (resizingShift.edge === 'left') {
          newStart.setMinutes(newStart.getMinutes() + minutesDelta)
          if (newStart >= newEnd) {
            newStart = new Date(newEnd.getTime() - 15 * 60 * 1000) // Minimum 15 minutes
          }
        } else {
          newEnd.setMinutes(newEnd.getMinutes() + minutesDelta)
          if (newEnd <= newStart) {
            newEnd = new Date(newStart.getTime() + 15 * 60 * 1000) // Minimum 15 minutes
          }
          // Clip at midnight
          const midnight = new Date(date)
          midnight.setHours(23, 59, 59, 999)
          if (newEnd > midnight) {
            newEnd = midnight
          }
        }

        const snappedStart = snapTime(fromZonedTime(newStart, timezone))
        const snappedEnd = snapTime(fromZonedTime(newEnd, timezone))
        const shift = shifts.find(s => s.id === resizingShift.shiftId)
        const overlap = checkOverlap(shift?.staff_id || '', snappedStart, snappedEnd, resizingShift.shiftId)

        setDragPreview({
          staffId: shift?.staff_id || '',
          startTime: snappedStart,
          endTime: snappedEnd,
          isValid: !overlap.hasOverlap,
          reason: overlap.reason,
        })
      }
    }

    const handleMouseUp = () => {
      if (creatingShift && dragPreview) {
        if (dragPreview.isValid) {
          onShiftCreate?.(dragPreview.staffId, dragPreview.startTime, dragPreview.endTime)
        }
        setCreatingShift(null)
        setDragPreview(null)
      } else if (draggingShift && dragPreview) {
        if (dragPreview.isValid) {
          onShiftMove?.(draggingShift.shiftId, dragPreview.staffId, dragPreview.startTime, dragPreview.endTime)
        }
        setDraggingShift(null)
        setDragPreview(null)
      } else if (resizingShift && dragPreview) {
        if (dragPreview.isValid) {
          onShiftResize?.(resizingShift.shiftId, dragPreview.startTime, dragPreview.endTime)
        }
        setResizingShift(null)
        setDragPreview(null)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [creatingShift, draggingShift, resizingShift, dragPreview, pixelToTime, snapTime, timezone, date, checkOverlap, shifts, onShiftCreate, onShiftMove, onShiftResize, sortedStaff])

  // Handle shift drag start
  const handleShiftDragStart = useCallback((e: React.MouseEvent, shift: Shift) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startY = e.clientY
    const originalStart = new Date(shift.start_time)
    const originalEnd = new Date(shift.end_time)
    const originalStaffId = shift.staff_id

    setDraggingShift({
      shiftId: shift.id,
      startX,
      startY,
      originalStart,
      originalEnd,
      originalStaffId,
    })
  }, [])

  // Handle shift resize start
  const handleShiftResizeStart = useCallback((e: React.MouseEvent, shift: Shift, edge: 'left' | 'right') => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const originalStart = new Date(shift.start_time)
    const originalEnd = new Date(shift.end_time)

    setResizingShift({
      shiftId: shift.id,
      edge,
      startX,
      originalStart,
      originalEnd,
    })
  }, [])

  // Get shift position and dimensions
  const getShiftLayout = useCallback((shift: Shift) => {
    const start = toZonedTime(new Date(shift.start_time), timezone)
    const end = toZonedTime(new Date(shift.end_time), timezone)
    const startPixel = timeToPixel(fromZonedTime(start, timezone))
    const endPixel = timeToPixel(fromZonedTime(end, timezone))
    const width = Math.max(48, endPixel - startPixel) // Minimum 48px width
    return { left: startPixel, width }
  }, [timezone, timeToPixel])

  return (
    <div ref={canvasRef} className="flex h-full overflow-auto bg-gray-50">
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
                className="flex h-[60px] items-center border-b border-gray-100 px-3"
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
        <div className="flex-1 relative">
          {/* Time Header */}
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
            <div className="flex relative" style={{ width: `${TIME_SLOTS.length * 24}px` }}>
              {TIME_SLOTS.filter((_, i) => i % 4 === 0).map((time, idx) => (
                <div
                  key={time}
                  className="absolute border-r border-gray-200 px-2 py-2 text-xs font-medium text-gray-500"
                  style={{ left: `${idx * 96}px`, width: '96px' }}
                >
                  {time}
                </div>
              ))}
            </div>
          </div>

          {/* Staff Rows with Shifts */}
          <div className="relative">
            {sortedStaff.map((staff, staffIndex) => {
              const staffShifts = shiftsByStaff.get(staff.id) || []
              const isSelected = selectedShiftIds.includes(staff.id)

              return (
                <div
                  key={staff.id}
                  className="relative h-[60px] border-b border-gray-100"
                  style={{ position: 'relative' }}
                >
                  {/* Time slot grid lines (subtle) */}
                  <div className="absolute inset-0 flex pointer-events-none" style={{ width: `${TIME_SLOTS.length * 24}px` }}>
                    {TIME_SLOTS.map((_, i) => (
                      <div
                        key={i}
                        className="absolute border-r border-gray-100"
                        style={{ left: `${i * 24}px`, width: '24px', height: '100%' }}
                      />
                    ))}
                  </div>

                  {/* Existing shifts */}
                  {staffShifts.map((shift) => {
                    const layout = getShiftLayout(shift)
                    const isShiftSelected = selectedShiftIds.includes(shift.id)
                    const hasConflict = conflicts.some(c => c.shift_id === shift.id)

                    return (
                      <div
                        key={shift.id}
                        className="absolute top-0 h-full"
                        style={{
                          left: `${layout.left}px`,
                          width: `${layout.width}px`,
                          zIndex: isShiftSelected ? 10 : 1,
                        }}
                      >
                        <ShiftBlock
                          shift={shift}
                          timezone={timezone}
                          conflicts={conflicts}
                          onClick={() => onShiftClick?.(shift)}
                          onDragStart={(e) => handleShiftDragStart(e, shift)}
                          onResizeStart={(e, edge) => handleShiftResizeStart(e, shift, edge)}
                          isSelected={isShiftSelected}
                          hasConflict={hasConflict}
                        />
                      </div>
                    )
                  })}

                  {/* Drag preview */}
                  {dragPreview && dragPreview.staffId === staff.id && (
                    <div
                      className="absolute top-0 h-full pointer-events-none"
                      style={{
                        left: `${timeToPixel(dragPreview.startTime)}px`,
                        width: `${Math.max(48, timeToPixel(dragPreview.endTime) - timeToPixel(dragPreview.startTime))}px`,
                        zIndex: 20,
                      }}
                    >
                      <div
                        className={`h-full rounded border-2 ${
                          dragPreview.isValid
                            ? 'bg-blue-200 border-blue-400 opacity-60'
                            : 'bg-red-200 border-red-400 opacity-60'
                        }`}
                      >
                        {!dragPreview.isValid && dragPreview.reason && (
                          <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs px-1 py-0.5 rounded-t">
                            {dragPreview.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Clickable cells for creating shifts */}
                  <div className="absolute inset-0" style={{ width: `${TIME_SLOTS.length * 24}px` }}>
                    {TIME_SLOTS.map((timeSlot, slotIndex) => (
                      <div
                        key={timeSlot}
                        className="absolute top-0 h-full cursor-crosshair hover:bg-blue-50 hover:bg-opacity-30"
                        style={{
                          left: `${slotIndex * 24}px`,
                          width: '24px',
                        }}
                        onMouseDown={(e) => handleCanvasMouseDown(e, staff.id, timeSlot)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
