'use client'

import { format, startOfWeek, addDays, subWeeks, addWeeks } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline'

interface WeekPlannerHeaderProps {
  currentWeek: Date
  onWeekChange: (week: Date) => void
  onTodayClick: () => void
  onCreateShift: () => void
  canCreateShift?: boolean
}

export default function WeekPlannerHeader({
  currentWeek,
  onWeekChange,
  onTodayClick,
  onCreateShift,
  canCreateShift = true,
}: WeekPlannerHeaderProps) {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }) // Monday
  const weekEnd = addDays(weekStart, 6) // Sunday

  const handlePreviousWeek = () => {
    onWeekChange(subWeeks(currentWeek, 1))
  }

  const handleNextWeek = () => {
    onWeekChange(addWeeks(currentWeek, 1))
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Week Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousWeek}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Next week"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </h2>
          </div>

          <button
            onClick={onTodayClick}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {canCreateShift && (
            <button
              onClick={onCreateShift}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
            >
              Create Shift
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


