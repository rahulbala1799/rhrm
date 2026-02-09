'use client'

import { Shift } from '@/lib/schedule/types'
import { formatTimeInTimezone } from '@/lib/schedule/timezone-utils'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import ShiftCost from './ShiftCost'

interface ShiftBlockProps {
  shift: Shift
  timezone: string
  conflicts?: Array<{ shift_id: string; type: string; message: string }>
  isGhost?: boolean
  isOvernight?: boolean
  onClick?: (e?: React.MouseEvent) => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onContextMenu?: (e: React.MouseEvent) => void
  isSelected?: boolean
  budgetViewActive?: boolean
  staffHourlyRate?: number | null
  isLoadingRates?: boolean
  overtimeCost?: {
    regularHours: number
    overtimeHours: number
    regularCost: number
    overtimeCost: number
    totalCost: number
    hasOvertime: boolean
    resolvedHourlyRate: number | null
  }
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
  onContextMenu,
  isSelected = false,
  budgetViewActive = false,
  staffHourlyRate = null,
  isLoadingRates = false,
  overtimeCost,
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
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(e)
        }}
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
  // Use role colors if available, otherwise fallback to status colors
  const bgColor = shift.role?.bg_color || (statusColors[shift.status].includes('bg-') ? undefined : '#E5E7EB')
  const textColor = shift.role?.text_color || (statusColors[shift.status].includes('text-') ? undefined : '#1F2937')
  const borderColor = shift.role?.bg_color || undefined

  // Determine if we should use inline styles (role colors) or classes (status colors)
  const useRoleColors = shift.role && shift.role.bg_color && shift.role.text_color

  return (
    <button
      className={`
        w-full rounded-lg border-2 p-2 text-left
        hover:shadow-md transition-all
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        ${!useRoleColors ? statusColors[shift.status] : ''}
        ${shift.status === 'cancelled' ? 'cursor-not-allowed opacity-60 line-through' : 'cursor-pointer'}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-lg scale-[1.02]' : ''}
      `}
      style={useRoleColors ? {
        backgroundColor: bgColor,
        color: textColor,
        borderColor: borderColor,
      } : undefined}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(e)
      }}
      onContextMenu={(e) => {
        e.stopPropagation()
        onContextMenu?.(e)
      }}
      draggable={shift.status !== 'cancelled'}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      disabled={shift.status === 'cancelled'}
      title={`${shift.role?.name ? `${shift.role.name} - ` : ''}${timeStr} - ${locationName}${warningConflict ? ` - ${warningConflict.message}` : ''}`}
      aria-label={`${shift.role?.name ? `${shift.role.name} ` : ''}Shift ${timeStr} at ${locationName}${warningConflict ? ` - ${warningConflict.message}` : ''}`}
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
          {budgetViewActive && !isGhost && (
            <ShiftCost
              shift={shift}
              staffHourlyRate={staffHourlyRate}
              timezone={timezone}
              isLoading={isLoadingRates}
              overtimeCost={overtimeCost}
            />
          )}
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
