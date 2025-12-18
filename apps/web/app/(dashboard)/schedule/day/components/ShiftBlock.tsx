'use client'

import { Shift } from '../hooks/useDayShifts'
import { formatTimeInTimezone } from '@/lib/schedule/timezone-utils'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ShiftBlockProps {
  shift: Shift
  timezone: string
  conflicts?: Array<{ shift_id: string; type: string; message: string }>
  onClick?: () => void
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
}: ShiftBlockProps) {
  const timeStr = `${formatTimeInTimezone(shift.start_time, timezone)} - ${formatTimeInTimezone(shift.end_time, timezone)}`
  const locationName = shift.location?.name || 'Unknown location'
  const hasConflict = conflicts.some((c) => c.shift_id === shift.id)
  const conflict = conflicts.find((c) => c.shift_id === shift.id)

  // Use role colors if available, otherwise fallback to status colors
  const bgColor = shift.role?.bg_color
  const textColor = shift.role?.text_color
  const useRoleColors = shift.role && shift.role.bg_color && shift.role.text_color

  const displayName = shift.staff?.preferred_name || shift.staff?.first_name || 'Unknown'

  return (
    <button
      className={`
        h-full w-full rounded border-2 p-1 text-left text-xs
        hover:shadow-md transition-shadow cursor-pointer
        ${useRoleColors ? '' : statusColors[shift.status]}
        ${hasConflict ? 'border-red-500' : ''}
      `}
      style={
        useRoleColors
          ? {
              backgroundColor: bgColor,
              color: textColor,
              borderColor: bgColor,
            }
          : undefined
      }
      onClick={onClick}
      title={`${displayName} • ${timeStr} • ${locationName}${conflict ? ` • ${conflict.message}` : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{displayName}</div>
          <div className="text-xs opacity-90 truncate">{timeStr}</div>
          {locationName && (
            <div className="text-xs opacity-75 truncate">{locationName}</div>
          )}
        </div>
        {hasConflict && (
          <ExclamationTriangleIcon className="h-4 w-4 text-red-500 flex-shrink-0 ml-1" />
        )}
      </div>
    </button>
  )
}

