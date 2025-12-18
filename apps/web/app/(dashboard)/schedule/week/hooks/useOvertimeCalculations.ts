import { useState, useEffect, useMemo } from 'react'
import { Shift } from './useWeekShifts'
import { createClient } from '@/lib/supabase/client'
import { getRatesForStaffBatch, findRateForDate } from '@/lib/staff-rates/utils'
import {
  getPayCycleStart,
  getPayCycleEnd,
  calculateContractedHoursThreshold,
  calculateCumulativeHours,
  calculateShiftCostWithOvertime,
} from '../utils/overtime-calculations'
import { getCurrentPayPeriod, PayPeriodConfig } from '@/lib/pay-period/utils'
import { toZonedTime } from 'date-fns-tz'

interface StaffOvertimeConfig {
  contractedWeeklyHours: number | null
  overtimeEnabled: boolean | null
  overtimeRuleType: 'multiplier' | 'flat_extra' | null
  overtimeMultiplier: number | null
  overtimeFlatExtra: number | null
  payFrequency: 'weekly' | 'fortnightly' | 'monthly' | null
}

interface ShiftCostBreakdown {
  regularHours: number
  overtimeHours: number
  regularCost: number
  overtimeCost: number
  totalCost: number
  hasOvertime: boolean
  resolvedHourlyRate: number | null
}

interface UseOvertimeCalculationsProps {
  shifts: Shift[]
  staffList: Array<{ id: string }>
  staffOvertimeConfigs: Map<string, StaffOvertimeConfig>
  payPeriodConfig: PayPeriodConfig | null
  timezone: string
  weekStart: Date
  budgetViewActive: boolean
}

export function useOvertimeCalculations({
  shifts,
  staffList,
  staffOvertimeConfigs,
  payPeriodConfig,
  timezone,
  weekStart,
  budgetViewActive,
}: UseOvertimeCalculationsProps) {
  const [shiftCosts, setShiftCosts] = useState<Map<string, ShiftCostBreakdown>>(new Map())
  const [isCalculating, setIsCalculating] = useState(false)
  const [rateHistory, setRateHistory] = useState<Map<string, Array<{hourly_rate: number, effective_date: string}>>>(new Map())

  // Step 0: Fetch rate history for all staff
  useEffect(() => {
    if (!budgetViewActive || shifts.length === 0 || staffList.length === 0) {
      setRateHistory(new Map())
      return
    }

    const fetchRateHistory = async () => {
      try {
        const supabase = createClient()
        const staffIds = staffList.map(s => s.id)
        
        // Get max date from shifts
        const maxDate = shifts.reduce((max, shift) => {
          const shiftDate = new Date(shift.start_time)
          return shiftDate > max ? shiftDate : max
        }, new Date(0))

        const rates = await getRatesForStaffBatch(staffIds, maxDate, supabase)
        setRateHistory(rates)
      } catch (error) {
        console.error('Error fetching rate history:', error)
        setRateHistory(new Map())
      }
    }

    fetchRateHistory()
  }, [budgetViewActive, shifts, staffList])

  // Calculate overtime costs
  useEffect(() => {
    if (!budgetViewActive || shifts.length === 0 || !payPeriodConfig) {
      setShiftCosts(new Map())
      return
    }

    setIsCalculating(true)

    try {
      const costs = new Map<string, ShiftCostBreakdown>()

      // Group shifts by staff
      const shiftsByStaff = new Map<string, Shift[]>()
      shifts.forEach(shift => {
        if (!shiftsByStaff.has(shift.staff_id)) {
          shiftsByStaff.set(shift.staff_id, [])
        }
        shiftsByStaff.get(shift.staff_id)!.push(shift)
      })

      // Process each staff member
      shiftsByStaff.forEach((staffShifts, staffId) => {
        const config = staffOvertimeConfigs.get(staffId)
        if (!config) {
          // No config - calculate as regular hours only
          staffShifts.forEach(shift => {
            const staffRates = rateHistory.get(staffId) || []
            const shiftDate = toZonedTime(new Date(shift.start_time), timezone)
            const resolvedRate = findRateForDate(staffRates, shiftDate)
            
            costs.set(shift.id, {
              regularHours: 0,
              overtimeHours: 0,
              regularCost: 0,
              overtimeCost: 0,
              totalCost: 0,
              hasOvertime: false,
              resolvedHourlyRate: resolvedRate
            })
          })
          return
        }

        // Get pay cycle period
        let payCycleStart: Date
        let payCycleEnd: Date
        
        try {
          payCycleStart = getPayCycleStart(weekStart, config.payFrequency, payPeriodConfig, timezone)
          payCycleEnd = getPayCycleEnd(payCycleStart, config.payFrequency, timezone)
        } catch (error) {
          // Pay cycle calculation failed (e.g., missing first_period_start for fortnightly)
          // Calculate as regular hours only
          staffShifts.forEach(shift => {
            const staffRates = rateHistory.get(staffId) || []
            const shiftDate = toZonedTime(new Date(shift.start_time), timezone)
            const resolvedRate = findRateForDate(staffRates, shiftDate)
            
            costs.set(shift.id, {
              regularHours: 0,
              overtimeHours: 0,
              regularCost: 0,
              overtimeCost: 0,
              totalCost: 0,
              hasOvertime: false,
              resolvedHourlyRate: resolvedRate
            })
          })
          return
        }

        // Get contracted hours threshold
        const contractedHoursThreshold = calculateContractedHoursThreshold(
          config.contractedWeeklyHours,
          config.payFrequency
        )

        // Sort shifts by start_time
        const sortedShifts = [...staffShifts].sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )

        // Calculate cumulative hours
        const cumulativeHours = calculateCumulativeHours(
          sortedShifts,
          payCycleStart,
          payCycleEnd,
          timezone
        )

        // Calculate costs for each shift
        sortedShifts.forEach(shift => {
          const cumulativeHoursBeforeShift = cumulativeHours.get(shift.id) || 0
          const staffRates = rateHistory.get(staffId) || []
          const shiftDate = toZonedTime(new Date(shift.start_time), timezone)
          const resolvedRate = findRateForDate(staffRates, shiftDate)

          const breakdown = calculateShiftCostWithOvertime(
            shift,
            cumulativeHoursBeforeShift,
            contractedHoursThreshold,
            resolvedRate,
            config.overtimeEnabled,
            config.overtimeRuleType,
            config.overtimeMultiplier,
            config.overtimeFlatExtra
          )

          costs.set(shift.id, {
            ...breakdown,
            resolvedHourlyRate: resolvedRate
          })
        })
      })

      setShiftCosts(costs)
    } catch (error) {
      console.error('Error calculating overtime costs:', error)
      setShiftCosts(new Map())
    } finally {
      setIsCalculating(false)
    }
  }, [
    budgetViewActive,
    shifts,
    staffOvertimeConfigs,
    payPeriodConfig,
    timezone,
    weekStart,
    rateHistory
  ])

  return {
    shiftCosts,
    isCalculating,
    rateHistory
  }
}

