'use client'

import { Shift } from '../hooks/useWeekShifts'
import { calculateShiftCost } from '../utils/budget-calculations'
import { formatCurrency } from '../utils/currency-formatting'

interface ShiftCostProps {
  shift: Shift
  staffHourlyRate: number | null
  timezone: string
  isLoading?: boolean
}

export default function ShiftCost({
  shift,
  staffHourlyRate,
  timezone,
  isLoading = false,
}: ShiftCostProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-200 h-3 w-12 rounded mt-1" />
    )
  }

  const cost = calculateShiftCost(
    shift.start_time,
    shift.end_time,
    shift.break_duration_minutes,
    staffHourlyRate
  )

  if (cost === null) {
    return (
      <div className="text-xs text-gray-400 italic mt-1" title="Hourly rate not set for this staff member">
        N/A
      </div>
    )
  }

  return (
    <div className="text-xs font-medium text-gray-700 mt-1">
      {formatCurrency(cost)}
    </div>
  )
}

