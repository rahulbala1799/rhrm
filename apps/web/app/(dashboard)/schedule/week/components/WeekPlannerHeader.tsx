'use client'

import { format, startOfWeek, addDays, subWeeks, addWeeks } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline'

import BudgetViewToggle from './BudgetViewToggle'

interface WeekPlannerHeaderProps {
  currentWeek: Date
  onWeekChange: (week: Date) => void
  onTodayClick: () => void
  onCreateShift: () => void
  canCreateShift?: boolean
  budgetViewActive?: boolean
  onBudgetViewToggle?: (active: boolean) => void
  canViewBudget?: boolean
}

export default function WeekPlannerHeader({
  currentWeek,
  onWeekChange,
  onTodayClick,
  onCreateShift,
  canCreateShift = true,
  budgetViewActive = false,
  onBudgetViewToggle,
  canViewBudget = false,
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
    <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Week Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousWeek}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Next week"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-500" />
            <h2 className="text-[15px] font-semibold text-gray-900">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </h2>
          </div>

          <button
            onClick={onTodayClick}
            className="bg-white ring-1 ring-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Today
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {canViewBudget && onBudgetViewToggle && (
            <BudgetViewToggle
              isActive={budgetViewActive}
              onToggle={onBudgetViewToggle}
            />
          )}
          {canCreateShift && (
            <button
              onClick={onCreateShift}
              className="bg-gray-900 text-white rounded-lg hover:bg-gray-800 shadow-sm font-medium text-sm px-4 py-2 transition-colors"
            >
              Create Shift
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


