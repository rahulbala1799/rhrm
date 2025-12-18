'use client'

import { Shift } from '../hooks/useWeekShifts'
import { formatTimeInTimezone } from '@/lib/schedule/timezone-utils'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ShiftBlockProps {
  shift: Shift
  timezone: string
  conflicts?: Array<{ shift_id: string; type: string; message: string }>
  isGhost?: boolean
  isOvernight?: boolean
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
}

const statusColors = {
  draft: 'bg-gray-200 border-gray-300 text-gray-700',
  published: 'bg-blue-100 border-blue-300 text-blue-800',
  confirmed: 'bg-green-100 border-green-300 text-green-800',
  cancelled: 'bg-gray-100 border-gray-300 text-gray-500 line-through opacity-60',
}

const statusLabels = {
  draft: 'Draft',
  published: 'Published',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
}

export default function ShiftBlock({
  shift,
  timezone,
  conflicts = [],
  isGhost = false,
  isOvernight = false,
  onClick,
  onDragStart,
  onDragEnd,
}: ShiftBlockProps) {
  const timeStr = `${formatTimeInTimezone(shift.start_time, timezone)} - ${formatTimeInTimezone(shift.end_time, timezone)}`
  const locationName = shift.location?.name || 'Unknown location'
  const hasWarnings = conflicts.some((c) => c.shift_id === shift.id && c.type !== 'overlap')
  const warningConflict = conflicts.find((c) => c.shift_id === shift.id && c.type !== 'overlap')

  // Ghost blocks are render-only, visually secondary
  if (isGhost) {
    return (
      <div
        className="rounded border border-dashed border-gray-300 bg-gray-50 bg-opacity-50 p-1.5 text-xs text-gray-500 opacity-60"
        onClick={onClick}
        draggable={!shift.status || shift.status !== 'cancelled'}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.()
          }
        }}
      >
        <div className="text-xs">continues</div>
      </div>
    )
  }

  // Primary block shows full details
  return (
    <button
      className={`
        w-full rounded-lg border-2 p-2 text-left
        hover:shadow-md transition-shadow
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        ${statusColors[shift.status]}
        ${shift.status === 'cancelled' ? 'cursor-not-allowed' : 'cursor-pointer'}
      `}
      onClick={onClick}
      draggable={shift.status !== 'cancelled'}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      disabled={shift.status === 'cancelled'}
      title={`${timeStr} - ${locationName}${warningConflict ? ` - ${warningConflict.message}` : ''}`}
      aria-label={`Shift ${timeStr} at ${locationName}${warningConflict ? ` - ${warningConflict.message}` : ''}`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{timeStr}</div>
          <div className="text-xs truncate" title={locationName}>
            {locationName.length > 20 ? `${locationName.substring(0, 20)}...` : locationName}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs px-1.5 py-0.5 rounded bg-white bg-opacity-50">
              {statusLabels[shift.status]}
            </span>
            {isOvernight && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-white bg-opacity-50">
                → next day
              </span>
            )}
          </div>
        </div>
        {hasWarnings && (
          <ExclamationTriangleIcon
            className="h-4 w-4 text-yellow-600 flex-shrink-0"
            title={warningConflict?.message || 'Warning'}
            aria-label={warningConflict?.message || 'Warning'}
          />
        )}
      </div>
    </button>
  )
}
