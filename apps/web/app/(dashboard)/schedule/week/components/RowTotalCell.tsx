'use client'

import { formatCurrency } from '../utils/currency-formatting'

interface RowTotalCellProps {
  totalCost: number
  hasData: boolean
  isLoading?: boolean
}

export default function RowTotalCell({
  totalCost,
  hasData,
  isLoading = false,
}: RowTotalCellProps) {
  if (isLoading) {
    return (
      <div className="sticky right-0 z-10 w-24 flex-shrink-0 border-l border-gray-200 bg-gray-50 p-2">
        <div className="animate-pulse bg-gray-200 h-5 w-16 rounded" />
      </div>
    )
  }

  return (
    <div className="sticky right-0 z-10 w-24 flex-shrink-0 border-l border-gray-200 bg-gray-50 p-2 text-right">
      {hasData ? (
        <div className="text-sm font-semibold text-gray-900">
          {formatCurrency(totalCost)}
        </div>
      ) : (
        <div className="text-sm text-gray-400">-</div>
      )}
    </div>
  )
}

