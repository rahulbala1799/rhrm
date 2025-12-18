'use client'

import { format, addDays } from 'date-fns'
import { formatCurrency } from '../utils/currency-formatting'

interface ColumnTotalsRowProps {
  weekStart: Date
  dayTotals: number[] // Array of 7 day totals
  grandTotal: number
  isLoading?: boolean
}

export default function ColumnTotalsRow({
  weekStart,
  dayTotals,
  grandTotal,
  isLoading = false,
}: ColumnTotalsRowProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="sticky bottom-0 z-10 flex border-t-2 border-gray-300 bg-gray-50">
      {/* Staff column placeholder */}
      <div className="w-48 flex-shrink-0 border-r border-gray-200 p-2">
        <div className="text-xs font-semibold text-gray-700">Totals</div>
      </div>

      {/* Day totals */}
      {days.map((day, index) => (
        <div
          key={index}
          className="flex-1 border-r border-gray-200 last:border-r-0 p-2 text-center"
        >
          {isLoading ? (
            <div className="animate-pulse bg-gray-200 h-5 w-16 rounded mx-auto" />
          ) : (
            <div className="text-sm font-semibold text-gray-900">
              {formatCurrency(dayTotals[index] || 0)}
            </div>
          )}
        </div>
      ))}

      {/* Grand total cell */}
      <div className="sticky right-0 z-10 w-24 flex-shrink-0 border-l-2 border-gray-300 bg-gray-100 p-2 text-right">
        {isLoading ? (
          <div className="animate-pulse bg-gray-200 h-5 w-20 rounded ml-auto" />
        ) : (
          <div className="text-base font-bold text-gray-900">
            {formatCurrency(grandTotal)}
          </div>
        )}
      </div>
    </div>
  )
}

