'use client'

import { Shift } from '../hooks/useWeekShifts'
import { calculateShiftCost } from '../utils/budget-calculations'
import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'

interface ShiftCostProps {
  shift: Shift
  staffHourlyRate: number | null
  timezone: string
  isLoading?: boolean
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

export default function ShiftCost({
  shift,
  staffHourlyRate,
  timezone,
  isLoading = false,
  overtimeCost,
}: ShiftCostProps) {
  const { format } = useFormatCurrency()
  
  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-200 h-3 w-12 rounded mt-1" />
    )
  }

  // Use overtime cost if available, otherwise fall back to basic calculation
  if (overtimeCost) {
    if (overtimeCost.totalCost === 0 && !overtimeCost.resolvedHourlyRate) {
      return (
        <div className="text-xs text-gray-400 italic mt-1" title="Hourly rate not set for this staff member">
          N/A
        </div>
      )
    }

    if (overtimeCost.hasOvertime) {
      return (
        <div className="mt-1">
          <div className="text-xs font-medium text-gray-700">
            {format(overtimeCost.totalCost)} ⚡
          </div>
          <div className="text-xs text-gray-500">
            {format(overtimeCost.regularCost)} + {format(overtimeCost.overtimeCost)} OT
          </div>
        </div>
      )
    }

    return (
      <div className="text-xs font-medium text-gray-700 mt-1">
        {format(overtimeCost.totalCost)}
      </div>
    )
  }

  // Fallback to basic calculation
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
      {format(cost)}
    </div>
  )
}

