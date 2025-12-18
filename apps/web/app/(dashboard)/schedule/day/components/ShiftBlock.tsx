'use client'

import { Shift } from '@/lib/schedule/types'
import { formatTimeInTimezone } from '@/lib/schedule/timezone-utils'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ShiftBlockProps {
  shift: Shift
  timezone: string
  conflicts?: Array<{ shift_id: string; type: string; message: string }>
  onClick?: (e: React.MouseEvent) => void
  onDragStart?: (e: React.MouseEvent) => void
  onResizeStart?: (e: React.MouseEvent, edge: 'left' | 'right') => void
  onContextMenu?: (e: React.MouseEvent) => void
  isSelected?: boolean
  hasConflict?: boolean
  animateSettle?: boolean // Subtle settle animation on successful drop
  animateConflict?: boolean // Pulse/shake on conflict rollback
}

const statusColors = {
  draft: 'bg-gray-200 border-gray-300 text-gray-700',
  published: 'bg-blue-100 border-blue-300 text-blue-800',
  confirmed: 'bg-green-100 border-green-300 text-green-800',
  cancelled: 'bg-gray-100 border-gray-300 text-gray-500 line-through opacity-60',
}

export default function ShiftBlock({
  shift,
  timezone,
  conflicts = [],
  onClick,
  onDragStart,
  onResizeStart,
  onContextMenu,
  isSelected = false,
  hasConflict = false,
  animateSettle = false,
  animateConflict = false,
}: ShiftBlockProps) {
  const timeStr = `${formatTimeInTimezone(shift.start_time, timezone)} - ${formatTimeInTimezone(shift.end_time, timezone)}`
  const locationName = shift.location?.name || 'Unknown location'
  const conflict = conflicts.find((c) => c.shift_id === shift.id)

  // Use role colors if available, otherwise fallback to status colors
  const bgColor = shift.role?.bg_color
  const textColor = shift.role?.text_color
  const useRoleColors = shift.role && shift.role.bg_color && shift.role.text_color

  const displayName = shift.staff?.preferred_name || shift.staff?.first_name || 'Unknown'

  // Determine border style based on status
  const borderStyle = shift.status === 'draft' ? 'border-dashed' : 'border-solid'
  const opacity = shift.status === 'draft' ? 'opacity-80' : 'opacity-100'

  return (
    <div className="relative h-full w-full group">
      {/* Resize handles */}
      {shift.status !== 'cancelled' && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-400/50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onMouseDown={(e) => {
              e.stopPropagation()
              onResizeStart?.(e, 'left')
            }}
            title="Resize start time"
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-400/50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onMouseDown={(e) => {
              e.stopPropagation()
              onResizeStart?.(e, 'right')
            }}
            title="Resize end time"
          />
        </>
      )}

      {/* Main shift block */}
      <button
        className={`
          h-full w-full rounded border-2 p-1 text-left text-xs
          hover:shadow-md transition-all
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          ${!useRoleColors ? statusColors[shift.status] : ''}
          ${shift.status === 'cancelled' ? 'cursor-not-allowed opacity-60' : 'cursor-move'}
          ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-lg' : ''}
          ${hasConflict ? 'border-red-500' : ''}
          ${borderStyle}
          ${opacity}
          ${animateSettle ? 'animate-[settle_150ms_ease-out]' : ''}
          ${animateConflict ? 'animate-[pulse_300ms_ease-in-out_2,shake_300ms_ease-in-out]' : ''}
        `}
        style={
          useRoleColors
            ? {
                backgroundColor: bgColor,
                color: textColor,
                borderColor: hasConflict ? '#ef4444' : bgColor,
                borderStyle: shift.status === 'draft' ? 'dashed' : 'solid',
                opacity: shift.status === 'draft' ? 0.8 : 1,
              }
            : undefined
        }
        onClick={(e) => onClick?.(e)}
        onMouseDown={(e) => {
          if (shift.status !== 'cancelled' && !e.defaultPrevented) {
            // Only start drag if not clicking on resize handle
            const target = e.target as HTMLElement
            if (!target.closest('.cursor-ew-resize')) {
              onDragStart?.(e)
            }
          }
        }}
        onContextMenu={onContextMenu}
        disabled={shift.status === 'cancelled'}
        title={`${displayName} • ${timeStr} • ${locationName}${conflict ? ` • ${conflict.message}` : ''}`}
        aria-label={`${displayName} shift ${timeStr} at ${locationName}${conflict ? ` - ${conflict.message}` : ''}`}
      >
        <div className="flex items-start justify-between h-full">
          <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
            <div>
              <div className="font-medium truncate">{displayName}</div>
              <div className="text-xs opacity-90 truncate">{timeStr}</div>
            </div>
            {locationName && (
              <div className="text-xs opacity-75 truncate mt-auto">{locationName}</div>
            )}
          </div>
          {hasConflict && (
            <div className="flex-shrink-0 ml-1">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
            </div>
          )}
        </div>
      </button>
    </div>
  )
}
