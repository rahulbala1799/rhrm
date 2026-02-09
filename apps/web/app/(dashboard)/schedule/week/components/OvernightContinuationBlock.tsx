'use client'

import { Shift } from '@/lib/schedule/types'

interface OvernightContinuationBlockProps {
  shift: Shift
  timezone: string
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
}

/**
 * Ghost block for overnight shift continuation
 * Render-only projection - never stored in state
 */
export default function OvernightContinuationBlock({
  shift,
  onClick,
  onDragStart,
  onDragEnd,
}: OvernightContinuationBlockProps) {
  return (
    <div
      className="rounded border border-dashed border-gray-300 bg-gray-50 bg-opacity-50 p-1.5 text-xs text-gray-500 opacity-60 mt-1"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      draggable={shift.status !== 'cancelled'}
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
      title="Continues from previous day"
      aria-label="Shift continues from previous day"
    >
      <div className="text-xs">continues</div>
    </div>
  )
}

