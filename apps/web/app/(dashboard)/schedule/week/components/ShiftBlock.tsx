'use client'

import { format, parseISO } from 'date-fns'
import { Shift } from '../hooks/useWeekShifts'

interface ShiftBlockProps {
  shift: Shift
  style?: React.CSSProperties
  onClick?: () => void
}

const statusColors = {
  draft: 'bg-gray-200 border-gray-300 text-gray-700',
  published: 'bg-blue-100 border-blue-300 text-blue-800',
  confirmed: 'bg-green-100 border-green-300 text-green-800',
  cancelled: 'bg-red-100 border-red-300 text-red-800 line-through',
}

export default function ShiftBlock({ shift, style, onClick }: ShiftBlockProps) {
  const startTime = new Date(shift.start_time)
  const endTime = new Date(shift.end_time)
  
  const timeStr = `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`
  const staffName = shift.staff
    ? shift.staff.preferred_name || `${shift.staff.first_name} ${shift.staff.last_name}`
    : 'Unknown Staff'
  const locationName = shift.location?.name || 'Unknown Location'

  return (
    <div
      className={`
        rounded-lg border-2 p-2 cursor-pointer
        hover:shadow-md transition-shadow
        ${statusColors[shift.status]}
      `}
      style={style}
      onClick={onClick}
      title={`${staffName} - ${locationName} - ${timeStr}`}
    >
      <div className="text-xs font-semibold truncate">{staffName}</div>
      <div className="text-xs truncate">{locationName}</div>
      <div className="text-xs mt-1">{timeStr}</div>
      {shift.status === 'draft' && (
        <div className="text-xs mt-1 opacity-75">Draft</div>
      )}
    </div>
  )
}

