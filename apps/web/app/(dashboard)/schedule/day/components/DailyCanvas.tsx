'use client'

import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { format, toZonedTime, fromZonedTime } from 'date-fns-tz'
import { Shift } from '@/lib/schedule/types'
import ShiftBlock from './ShiftBlock'
import ShiftContextMenu from './ShiftContextMenu'
import { applyTimeToDate } from '@/lib/schedule/timezone-utils'
import { normalizeTimeForCommit } from '@/lib/schedule/shift-updates'
import { DragController } from '../utils/dragController'
import './shift-animations.css'

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
  onShiftDuplicate?: (shift: Shift) => void
  onShiftPublish?: (shiftId: string) => void
  onShiftUnpublish?: (shiftId: string) => void
  snapEnabled?: boolean
  selectedShiftIds?: string[]
  onSelectionChange?: (shiftIds: string[]) => void
}

// Time slots: 6 AM to 11 PM, 15-minute intervals
const START_HOUR = 6
const END_HOUR = 23
const MINUTES_PER_SLOT = 15
const SLOTS_PER_HOUR = 60 / MINUTES_PER_SLOT
const SLOT_WIDTH_PX = 24

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

// Get initials from name
function getInitials(firstName: string | null, lastName: string | null, preferredName: string | null): string {
  const name = preferredName || firstName || ''
  const last = lastName || ''
  if (name && last) {
    return `${name[0]}${last[0]}`.toUpperCase()
  }
  if (name) {
    return name.substring(0, 2).toUpperCase()
  }
  return '??'
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
  onShiftCreate,
  onShiftMove,
  onShiftResize,
  onShiftDuplicate,
  onShiftPublish,
  onShiftUnpublish,
  snapEnabled = true,
  selectedShiftIds = [],
  onSelectionChange,
}: DailyCanvasProps) {
  // CRITICAL: These are only for tracking active drag state (not pointer position)
  // Pointer position is stored in dragControllerRef, not React state
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [hoveredStaffId, setHoveredStaffId] = useState<string | null>(null)
  const [invalidDropMessage, setInvalidDropMessage] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    shift: Shift
  } | null>(null)
  const [settlingShiftId, setSettlingShiftId] = useState<string | null>(null)
  const [conflictShiftId, setConflictShiftId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const gridScrollRef = useRef<HTMLDivElement>(null)
  
  // CRITICAL: Drag controller uses refs, not React state for pointer position
  const dragControllerRef = useRef(new DragController())
  
  // Only use React state for dragPreview (visual feedback) - not pointer position
  const [dragPreview, setDragPreview] = useState<{
    staffId: string
    startTime: Date
    endTime: Date
    isValid: boolean
    reason?: string
    snapLine?: number
    snapTimeLabel?: string
  } | null>(null)

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

  // Convert time to pixel X position
  const timeToPixel = useCallback((time: Date): number => {
    const localTime = toZonedTime(time, timezone)
    const hours = localTime.getHours()
    const minutes = localTime.getMinutes()
    const totalMinutes = (hours - START_HOUR) * 60 + minutes
    const slotIndex = totalMinutes / MINUTES_PER_SLOT
    return slotIndex * SLOT_WIDTH_PX
  }, [timezone])

  // Convert pixel X to time
  const pixelToTime = useCallback((pixelX: number): Date => {
    const slotIndex = Math.floor(pixelX / SLOT_WIDTH_PX)
    const clampedIndex = Math.max(0, Math.min(slotIndex, TIME_SLOTS.length - 1))
    const [hour, minute] = TIME_SLOTS[clampedIndex].split(':').map(Number)
    const targetDate = new Date(date)
    targetDate.setHours(hour, minute, 0, 0)
    return fromZonedTime(targetDate, timezone)
  }, [date, timezone])

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

  // Handle row overlay mouse down (for creating shifts)
  const handleRowMouseDown = useCallback((e: React.MouseEvent, staffId: string) => {
    if (e.button !== 0) return // Only left click
    if (isDragging || isResizing) return // Interaction lock: no create during drag/resize
    if (e.target !== e.currentTarget) return // Only if clicking directly on overlay

    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return

    const startX = e.clientX - canvasRect.left
    const startTime = pixelToTime(startX)
    const snappedStart = snapTime(startTime)

    dragControllerRef.current.startCreate(
      { staffId, startX, startTime: snappedStart },
      (preview) => setDragPreview(preview)
    )
    setIsCreating(true)
  }, [pixelToTime, snapTime, isDragging, isResizing])

  // Handle shift click (for selection)
  const handleShiftClick = useCallback((e: React.MouseEvent, shift: Shift) => {
    e.stopPropagation()
    if (onSelectionChange) {
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        // Multi-select: toggle
        if (selectedShiftIds.includes(shift.id)) {
          onSelectionChange(selectedShiftIds.filter(id => id !== shift.id))
        } else {
          onSelectionChange([...selectedShiftIds, shift.id])
        }
      } else {
        // Single select
        onSelectionChange([shift.id])
      }
    }
    onShiftClick?.(shift)
  }, [onSelectionChange, selectedShiftIds, onShiftClick])

  // Handle empty space click (clear selection)
  const handleEmptyClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onSelectionChange) {
      onSelectionChange([])
    }
  }, [onSelectionChange])

  // Escape clears selection, Delete removes selected shifts
  useEffect(() => {
    if (!onSelectionChange || !onDeleteShift) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if we're in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'Escape' && selectedShiftIds.length > 0 && !isCreating && !isDragging && !isResizing) {
        e.preventDefault()
        onSelectionChange([])
      } else if (e.key === 'Delete' && selectedShiftIds.length > 0 && !isCreating && !isDragging && !isResizing) {
        e.preventDefault()
        if (confirm(`Delete ${selectedShiftIds.length} shift${selectedShiftIds.length > 1 ? 's' : ''}?`)) {
          selectedShiftIds.forEach(shiftId => onDeleteShift?.(shiftId))
          onSelectionChange([])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedShiftIds, onSelectionChange, onDeleteShift, isCreating, isDragging, isResizing])

  // Mouse move/up handlers with RAF throttling
  useEffect(() => {
    if (!isCreating && !isDragging && !isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const currentX = e.clientX - canvasRect.left
      const currentY = e.clientY - canvasRect.top

      // Compute preview via drag controller (RAF-throttled)
      dragControllerRef.current.update(
        currentX,
        currentY,
        e.shiftKey,
        (state, x, y, shiftKey) => {
          // State is already passed as first parameter - check which type it is
          if ('staffId' in state && 'startTime' in state) {
            // Create state
            const createState = state as { staffId: string; startX: number; startTime: Date }
            const deltaX = x - createState.startX
            const slots = Math.max(1, Math.round(deltaX / SLOT_WIDTH_PX))
            const endTime = new Date(createState.startTime)
            endTime.setMinutes(endTime.getMinutes() + slots * MINUTES_PER_SLOT)

            // Clip at midnight
            const midnight = new Date(date)
            midnight.setHours(23, 59, 59, 999)
            const clippedEnd = endTime > midnight ? midnight : endTime

            const snappedEnd = snapTime(fromZonedTime(clippedEnd, timezone))
            const overlap = checkOverlap(createState.staffId, createState.startTime, snappedEnd)

            // Check for snap line
            let snapLine: number | undefined
            let snapTimeLabel: string | undefined
            if (snapEnabled) {
              const snappedX = timeToPixel(snappedEnd)
              if (Math.abs(x - snappedX) < 5) {
                snapLine = snappedX
                snapTimeLabel = format(toZonedTime(snappedEnd, timezone), 'HH:mm')
              }
            }

            return {
              staffId: createState.staffId,
              startTime: createState.startTime,
              endTime: snappedEnd,
              isValid: !overlap.hasOverlap,
              reason: overlap.reason,
              snapLine,
              snapTimeLabel,
            }
          } else if ('shiftId' in state && 'startY' in state) {
            // Drag state
            const dragState = state as { shiftId: string; startX: number; startY: number; originalStart: Date; originalEnd: Date; originalStaffId: string }
            const deltaX = x - dragState.startX
            const deltaY = y - dragState.startY
            const shiftHeight = STAFF_ROW_HEIGHT

            // Find target staff row
            const targetStaffIndex = Math.round(deltaY / shiftHeight)
            const staffIndex = sortedStaff.findIndex((s: { id: string }) => s.id === dragState.originalStaffId)
            const newStaffIndex = staffIndex + targetStaffIndex
            const targetStaff = newStaffIndex >= 0 && newStaffIndex < sortedStaff.length
              ? sortedStaff[newStaffIndex]
              : sortedStaff[staffIndex]

            // Check if Shift key is held for staff change
            const canChangeStaff = shiftKey && targetStaff.id !== dragState.originalStaffId

            // Calculate new time
            const slotWidth = SLOT_WIDTH_PX
            const slots = Math.round(deltaX / slotWidth)
            const minutesDelta = slots * MINUTES_PER_SLOT
            const newStart = new Date(dragState.originalStart)
            newStart.setMinutes(newStart.getMinutes() + minutesDelta)
            const duration = dragState.originalEnd.getTime() - dragState.originalStart.getTime()
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

            const finalStaffId = canChangeStaff ? targetStaff.id : dragState.originalStaffId
            const overlap = checkOverlap(finalStaffId, snappedStart, snappedEnd, dragState.shiftId)

            // Check for snap line
            let snapLine: number | undefined
            let snapTimeLabel: string | undefined
            if (snapEnabled) {
              const snappedX = timeToPixel(snappedStart)
              if (Math.abs(x - snappedX) < 5) {
                snapLine = snappedX
                snapTimeLabel = format(toZonedTime(snappedStart, timezone), 'HH:mm')
              }
            }

            return {
              staffId: finalStaffId,
              startTime: snappedStart,
              endTime: snappedEnd,
              isValid: !overlap.hasOverlap,
              reason: overlap.reason,
              snapLine,
              snapTimeLabel,
            }
          } else if ('edge' in state) {
            // Resize state
            const resizeState = state as { shiftId: string; edge: 'left' | 'right'; startX: number; originalStart: Date; originalEnd: Date }
            const deltaX = x - resizeState.startX
            const slotWidth = SLOT_WIDTH_PX
            const slots = Math.round(deltaX / slotWidth)
            const minutesDelta = slots * MINUTES_PER_SLOT

            let newStart = new Date(resizeState.originalStart)
            let newEnd = new Date(resizeState.originalEnd)

            if (resizeState.edge === 'left') {
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
            const shift = shifts.find((s: Shift) => s.id === resizeState.shiftId)
            const overlap = checkOverlap(shift?.staff_id || '', snappedStart, snappedEnd, resizeState.shiftId)

            // Check for snap line
            let snapLine: number | undefined
            let snapTimeLabel: string | undefined
            if (snapEnabled) {
              const snappedX = timeToPixel(resizeState.edge === 'left' ? snappedStart : snappedEnd)
              if (Math.abs(x - snappedX) < 5) {
                snapLine = snappedX
                snapTimeLabel = format(toZonedTime(resizeState.edge === 'left' ? snappedStart : snappedEnd, timezone), 'HH:mm')
              }
            }

            return {
              staffId: shift?.staff_id || '',
              startTime: snappedStart,
              endTime: snappedEnd,
              isValid: !overlap.hasOverlap,
              reason: overlap.reason,
              snapLine,
              snapTimeLabel,
            }
          }
          return null
        }
      )
    }

    const handleMouseUp = () => {
      const result = dragControllerRef.current.endDrag()
      if (!result || !dragPreview) return

      if (result.type === 'create' && dragPreview.isValid) {
        // CRITICAL: Normalize time before commit
        const normalizedStart = normalizeTimeForCommit(dragPreview.startTime, timezone, MINUTES_PER_SLOT)
        const normalizedEnd = normalizeTimeForCommit(dragPreview.endTime, timezone, MINUTES_PER_SLOT)
        onShiftCreate?.(dragPreview.staffId, new Date(normalizedStart), new Date(normalizedEnd))
        // Settle animation will be handled by the new shift appearing
      } else if (result.type === 'create') {
        setInvalidDropMessage(dragPreview.reason || 'Cannot create shift')
        setTimeout(() => setInvalidDropMessage(null), 800)
      } else if (result.type === 'drag' && dragPreview.isValid) {
        // CRITICAL: Normalize time before commit
        const normalizedStart = normalizeTimeForCommit(dragPreview.startTime, timezone, MINUTES_PER_SLOT)
        const normalizedEnd = normalizeTimeForCommit(dragPreview.endTime, timezone, MINUTES_PER_SLOT)
        onShiftMove?.(result.state.shiftId, dragPreview.staffId, new Date(normalizedStart), new Date(normalizedEnd))
        // Settle animation
        setSettlingShiftId(result.state.shiftId)
        setTimeout(() => setSettlingShiftId(null), 150)
      } else if (result.type === 'drag') {
        // Conflict rollback - shake animation
        setConflictShiftId(result.state.shiftId)
        setTimeout(() => setConflictShiftId(null), 300)
        setInvalidDropMessage(dragPreview.reason || 'Cannot move shift')
        setTimeout(() => setInvalidDropMessage(null), 800)
      } else if (result.type === 'resize' && dragPreview.isValid) {
        // CRITICAL: Normalize time before commit
        const normalizedStart = normalizeTimeForCommit(dragPreview.startTime, timezone, MINUTES_PER_SLOT)
        const normalizedEnd = normalizeTimeForCommit(dragPreview.endTime, timezone, MINUTES_PER_SLOT)
        onShiftResize?.(result.state.shiftId, new Date(normalizedStart), new Date(normalizedEnd))
        // Settle animation
        setSettlingShiftId(result.state.shiftId)
        setTimeout(() => setSettlingShiftId(null), 150)
      } else if (result.type === 'resize') {
        // Conflict rollback - shake animation
        setConflictShiftId(result.state.shiftId)
        setTimeout(() => setConflictShiftId(null), 300)
        setInvalidDropMessage(dragPreview.reason || 'Cannot resize shift')
        setTimeout(() => setInvalidDropMessage(null), 800)
      }

      setIsCreating(false)
      setIsDragging(false)
      setIsResizing(false)
      setDragPreview(null)
    }

    // CRITICAL: Interaction lock - Escape cancels drag immediately
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isCreating || isDragging || isResizing)) {
        dragControllerRef.current.cancel()
        setIsCreating(false)
        setIsDragging(false)
        setIsResizing(false)
        setDragPreview(null)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isCreating, isDragging, isResizing, dragPreview, pixelToTime, snapTime, timezone, date, checkOverlap, shifts, onShiftCreate, onShiftMove, onShiftResize, sortedStaff, snapEnabled, timeToPixel, shiftsByStaff])

  // Handle shift drag start
  const handleShiftDragStart = useCallback((e: React.MouseEvent, shift: Shift) => {
    if (e.button !== 0) return
    if (isCreating || isResizing) return // Interaction lock: no drag during create/resize
    e.preventDefault()
    e.stopPropagation()

    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return

    const startX = e.clientX - canvasRect.left
    const startY = e.clientY - canvasRect.top
    const originalStart = new Date(shift.start_time)
    const originalEnd = new Date(shift.end_time)
    const originalStaffId = shift.staff_id

    dragControllerRef.current.startDrag(
      {
        shiftId: shift.id,
        startX,
        startY,
        originalStart,
        originalEnd,
        originalStaffId,
      },
      (preview) => setDragPreview(preview)
    )
    setIsDragging(true)
  }, [isCreating, isResizing])

  // Handle shift resize start
  const handleShiftResizeStart = useCallback((e: React.MouseEvent, shift: Shift, edge: 'left' | 'right') => {
    if (e.button !== 0) return
    if (isCreating || isDragging) return // Interaction lock: no resize during create/drag
    e.preventDefault()
    e.stopPropagation()

    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return

    const startX = e.clientX - canvasRect.left
    const originalStart = new Date(shift.start_time)
    const originalEnd = new Date(shift.end_time)

    dragControllerRef.current.startResize(
      {
        shiftId: shift.id,
        edge,
        startX,
        originalStart,
        originalEnd,
      },
      (preview) => setDragPreview(preview)
    )
    setIsResizing(true)
  }, [isCreating, isDragging])

  // Get shift position and dimensions
  const getShiftLayout = useCallback((shift: Shift) => {
    const start = toZonedTime(new Date(shift.start_time), timezone)
    const end = toZonedTime(new Date(shift.end_time), timezone)
    const startPixel = timeToPixel(fromZonedTime(start, timezone))
    const endPixel = timeToPixel(fromZonedTime(end, timezone))
    const width = Math.max(48, endPixel - startPixel)
    return { left: startPixel, width }
  }, [timezone, timeToPixel])

  const gridWidth = TIME_SLOTS.length * SLOT_WIDTH_PX

  return (
    <div ref={canvasRef} className="h-full w-full overflow-hidden bg-slate-50">
      {/* Single scroll container */}
      <div ref={gridScrollRef} className="h-full overflow-auto">
        <div className="flex" style={{ minWidth: `${gridWidth + 192}px` }}>
          {/* Staff Column - Sticky Left */}
          <div className="sticky left-0 z-20 w-48 border-r border-slate-200 bg-white">
            <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur px-3 py-2 text-xs font-medium text-slate-500">
              Staff
            </div>
            {sortedStaff.map((staff) => {
              const displayName = staff.preferred_name || staff.first_name || staff.last_name || 'Unnamed'
              const initials = getInitials(staff.first_name, staff.last_name, staff.preferred_name)
              const hasShifts = (shiftsByStaff.get(staff.id) || []).length > 0
              const isHovered = hoveredStaffId === staff.id

              return (
                <div
                  key={staff.id}
                  className={`flex h-[60px] items-center border-b border-slate-100 px-3 transition-colors ${
                    isHovered ? 'bg-slate-50' : ''
                  }`}
                  onMouseEnter={() => setHoveredStaffId(staff.id)}
                  onMouseLeave={() => setHoveredStaffId(null)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{displayName}</div>
                      {staff.department && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {staff.department}
                          </span>
                        </div>
                      )}
                      {staff.location?.name && (
                        <div className="text-xs text-slate-500 truncate mt-0.5">{staff.location.name}</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time Grid - Sticky Header + Scrollable Rows */}
          <div className="flex-1 relative">
            {/* Time Header - Sticky Top */}
            <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur" style={{ height: '40px' }}>
              <div className="relative" style={{ width: `${gridWidth}px`, height: '40px' }}>
                {/* Hour labels */}
                {TIME_SLOTS.map((timeSlot, slotIndex) => {
                  const [hour, minute] = timeSlot.split(':').map(Number)
                  const isHour = minute === 0
                  if (!isHour) return null

                  return (
                    <div
                      key={`label-${slotIndex}`}
                      className="absolute top-0 bottom-0 flex items-center px-2 text-xs font-medium text-slate-600 border-r border-slate-200"
                      style={{ left: `${slotIndex * SLOT_WIDTH_PX}px`, width: `${SLOT_WIDTH_PX * 4}px` }}
                    >
                      {timeSlot}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Staff Rows with Shifts */}
            <div className="relative">
              {sortedStaff.map((staff) => {
                const staffShifts = shiftsByStaff.get(staff.id) || []
                const isHovered = hoveredStaffId === staff.id
                const hasShifts = staffShifts.length > 0

                return (
                  <div
                    key={staff.id}
                    className={`relative h-[60px] border-b border-slate-100 transition-colors ${
                      isHovered ? 'bg-slate-50/50' : ''
                    }`}
                    style={{ width: `${gridWidth}px` }}
                  >
                    {/* Grid Lines Layer - Pointer Events None */}
                    <div className="absolute inset-0 pointer-events-none">
                      {TIME_SLOTS.map((_, slotIndex) => {
                        const [hour, minute] = TIME_SLOTS[slotIndex].split(':').map(Number)
                        const isHour = minute === 0
                        return (
                          <div
                            key={slotIndex}
                            className={`absolute top-0 bottom-0 ${
                              isHour ? 'border-r-2 border-slate-200' : 'border-r border-slate-100'
                            }`}
                            style={{ left: `${slotIndex * SLOT_WIDTH_PX}px`, width: '1px' }}
                          />
                        )
                      })}
                    </div>

                    {/* Shifts Layer */}
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
                            onClick={(e: React.MouseEvent<Element>) => {
                              e.stopPropagation()
                              handleShiftClick(e, shift)
                            }}
                            onDragStart={(e) => handleShiftDragStart(e, shift)}
                            onResizeStart={(e, edge) => handleShiftResizeStart(e, shift, edge)}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                shift,
                              })
                            }}
                            isSelected={isShiftSelected}
                            hasConflict={hasConflict}
                            animateSettle={settlingShiftId === shift.id}
                            animateConflict={conflictShiftId === shift.id}
                          />
                        </div>
                      )
                    })}

                    {/* Drag Preview */}
                    {dragPreview && dragPreview.staffId === staff.id && (
                      <>
                        {/* Snap Line with Time Label */}
                        {dragPreview.snapLine !== undefined && (
                          <>
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-30 pointer-events-none"
                              style={{ left: `${dragPreview.snapLine}px` }}
                            />
                            {dragPreview.snapTimeLabel && (
                              <div
                                className="absolute -top-6 left-0 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded whitespace-nowrap z-30 pointer-events-none"
                                style={{ left: `${dragPreview.snapLine}px`, transform: 'translateX(-50%)' }}
                              >
                                {dragPreview.snapTimeLabel}
                              </div>
                            )}
                          </>
                        )}
                        {/* Preview Block */}
                        <div
                          className="absolute top-0 h-full pointer-events-none z-20"
                          style={{
                            left: `${timeToPixel(dragPreview.startTime)}px`,
                            width: `${Math.max(48, timeToPixel(dragPreview.endTime) - timeToPixel(dragPreview.startTime))}px`,
                          }}
                        >
                          <div
                            className={`h-full rounded border-2 ${
                              dragPreview.isValid
                                ? 'bg-blue-200/50 border-blue-400 border-dashed'
                                : 'bg-red-200/50 border-red-400 border-dashed'
                            }`}
                          >
                            {/* Time Tooltip */}
                            <div className={`absolute -top-6 left-0 px-1.5 py-0.5 text-xs rounded whitespace-nowrap ${
                              dragPreview.isValid
                                ? 'bg-blue-600 text-white'
                                : 'bg-red-600 text-white'
                            }`}>
                              {format(toZonedTime(dragPreview.startTime, timezone), 'HH:mm')}–{format(toZonedTime(dragPreview.endTime, timezone), 'HH:mm')}
                            </div>
                            {/* Invalid Reason Badge */}
                            {!dragPreview.isValid && dragPreview.reason && (
                              <div className="absolute top-1 right-1 px-1.5 py-0.5 text-xs bg-red-600 text-white rounded">
                                {dragPreview.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Empty Row Hint */}
                    {!hasShifts && isHovered && !isCreating && !isDragging && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-xs text-slate-400 bg-white/80 px-3 py-1 rounded border border-slate-200">
                          Drag to create shift
                        </div>
                      </div>
                    )}

                    {/* Single Interaction Overlay Per Row */}
                    <div
                      className="absolute inset-0 cursor-crosshair"
                      style={{ width: `${gridWidth}px` }}
                      onMouseDown={(e) => handleRowMouseDown(e, staff.id)}
                      onClick={handleEmptyClick}
                    />

                    {/* Invalid Drop Message */}
                    {invalidDropMessage && dragPreview?.staffId === staff.id && (
                      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 px-3 py-1.5 text-xs bg-red-600 text-white rounded shadow-lg z-40 pointer-events-none">
                        Blocked: {invalidDropMessage}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ShiftContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          shift={contextMenu.shift}
          onClose={() => setContextMenu(null)}
          onEdit={() => onShiftClick?.(contextMenu.shift)}
          onDelete={() => onDeleteShift?.(contextMenu.shift.id)}
          onDuplicate={() => onShiftDuplicate?.(contextMenu.shift)}
          onPublish={() => onShiftPublish?.(contextMenu.shift.id)}
          onUnpublish={() => onShiftUnpublish?.(contextMenu.shift.id)}
          canPublish={true}
        />
      )}
    </div>
  )
}
