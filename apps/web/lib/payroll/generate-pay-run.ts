// Generate pay run from shifts in the planner — see PAY_RUNS_DESIGN.md

import { SupabaseClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { getRatesForStaffBatch, findRateForDate } from '@/lib/staff-rates/utils'
import { calculateOvertimeForLine } from './overtime'

export interface GeneratePayRunOptions {
  tenantId: string
  payPeriodStart: string // YYYY-MM-DD
  payPeriodEnd: string   // YYYY-MM-DD
  timezone?: string     // tenant timezone for shift date filtering
  createdBy: string | null
  supabase: SupabaseClient
}

export interface GeneratedLine {
  staff_id: string
  tenant_id: string
  employee_number: string
  staff_name: string
  regular_hours: number
  overtime_hours: number
  total_hours: number
  hourly_rate: number
  overtime_rate: number
  regular_pay: number
  overtime_pay: number
  adjustments: number
  adjustment_reason: null
  gross_pay: number
  status: 'included'
  timesheet_ids: string[] // shift IDs (stored in same column for audit)
}

function buildRunName(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart + 'T00:00:00')
  const end = new Date(periodEnd + 'T00:00:00')
  return `${format(start, 'd MMM')} to ${format(end, 'd MMM yyyy')}`
}

/**
 * Compute shift duration in hours (end - start minus break).
 */
function shiftHours(startTime: string, endTime: string, breakMinutes: number): number {
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const hours = (end - start) / (1000 * 60 * 60)
  const breakHours = (breakMinutes || 0) / 60
  return Math.max(0, hours - breakHours)
}

/**
 * Fetch shifts in the pay period (by start date in tenant TZ), group by staff, and build line data.
 * Does not insert — returns run payload and lines for caller to insert.
 */
export async function generatePayRunData(
  options: GeneratePayRunOptions
): Promise<{ name: string; lines: GeneratedLine[]; timesheetIdsByStaff: Map<string, string[]> }> {
  const { tenantId, payPeriodStart, payPeriodEnd, supabase, timezone: tz = 'UTC' } = options

  // Pay period bounds in tenant timezone, then to UTC for DB
  const [sy, sm, sd] = payPeriodStart.split('-').map(Number)
  const [ey, em, ed] = payPeriodEnd.split('-').map(Number)
  const periodStartLocal = new Date(sy, sm - 1, sd, 0, 0, 0, 0)
  const periodEndLocal = new Date(ey, em - 1, ed, 23, 59, 59, 999)
  const periodStartUTC = fromZonedTime(periodStartLocal, tz)
  const periodEndUTC = fromZonedTime(periodEndLocal, tz)

  const { data: shifts, error: shiftError } = await supabase
    .from('shifts')
    .select('id, staff_id, start_time, end_time, break_duration_minutes')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .gte('start_time', periodStartUTC.toISOString())
    .lte('start_time', periodEndUTC.toISOString())

  if (shiftError) throw new Error(shiftError.message)

  const byStaff = new Map<string, { totalHours: number; shiftIds: string[] }>()
  for (const shift of shifts || []) {
    const hours = shiftHours(
      shift.start_time,
      shift.end_time,
      shift.break_duration_minutes ?? 0
    )
    const existing = byStaff.get(shift.staff_id)
    if (existing) {
      existing.totalHours += hours
      existing.shiftIds.push(shift.id)
    } else {
      byStaff.set(shift.staff_id, { totalHours: hours, shiftIds: [shift.id] })
    }
  }

  const staffIds = Array.from(byStaff.keys())
  if (staffIds.length === 0) {
    return {
      name: buildRunName(payPeriodStart, payPeriodEnd),
      lines: [],
      timesheetIdsByStaff: new Map(),
    }
  }

  const { data: staffRows, error: staffError } = await supabase
    .from('staff')
    .select('id, employee_number, first_name, last_name, contracted_weekly_hours, overtime_enabled, overtime_rule_type, overtime_multiplier, overtime_flat_extra')
    .in('id', staffIds)

  if (staffError) throw new Error(staffError.message)

  const staffMap = new Map((staffRows || []).map((s: any) => [s.id, s]))
  const periodEndDate = new Date(payPeriodEnd + 'T23:59:59')
  const ratesByStaff = await getRatesForStaffBatch(staffIds, periodEndDate, supabase)

  const lines: GeneratedLine[] = []
  const timesheetIdsByStaff = new Map<string, string[]>()

  for (const staffId of staffIds) {
    const staff = staffMap.get(staffId)
    if (!staff) continue

    const { totalHours, shiftIds } = byStaff.get(staffId)!
    timesheetIdsByStaff.set(staffId, shiftIds)

    const staffRates = ratesByStaff.get(staffId) || []
    const hourlyRate = findRateForDate(staffRates, periodEndDate)
    if (hourlyRate == null) continue

    const overtimeResult = calculateOvertimeForLine(
      totalHours,
      {
        contracted_weekly_hours: staff.contracted_weekly_hours ?? null,
        overtime_enabled: !!staff.overtime_enabled,
        overtime_rule_type: staff.overtime_rule_type ?? null,
        overtime_multiplier: staff.overtime_multiplier ?? null,
        overtime_flat_extra: staff.overtime_flat_extra ?? null,
      },
      hourlyRate
    )

    const regularPay = overtimeResult.regularHours * hourlyRate
    const overtimePay = overtimeResult.overtimeHours * overtimeResult.overtimeRate
    const grossPay = regularPay + overtimePay

    lines.push({
      staff_id: staffId,
      tenant_id: tenantId,
      employee_number: staff.employee_number || '',
      staff_name: [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim() || 'Unknown',
      regular_hours: Math.round(overtimeResult.regularHours * 100) / 100,
      overtime_hours: Math.round(overtimeResult.overtimeHours * 100) / 100,
      total_hours: Math.round(totalHours * 100) / 100,
      hourly_rate: hourlyRate,
      overtime_rate: Math.round(overtimeResult.overtimeRate * 100) / 100,
      regular_pay: Math.round(regularPay * 100) / 100,
      overtime_pay: Math.round(overtimePay * 100) / 100,
      adjustments: 0,
      adjustment_reason: null,
      gross_pay: Math.round(grossPay * 100) / 100,
      status: 'included',
      timesheet_ids: shiftIds,
    })
  }

  return {
    name: buildRunName(payPeriodStart, payPeriodEnd),
    lines,
    timesheetIdsByStaff,
  }
}

/**
 * Compute totals from lines (for preview or before trigger runs).
 */
export function totalsFromLines(lines: { total_hours: number; gross_pay: number; status: string }[]): {
  total_hours: number
  total_gross_pay: number
  staff_count: number
} {
  const included = lines.filter((l) => l.status === 'included')
  const total_hours = included.reduce((s, l) => s + l.total_hours, 0)
  const total_gross_pay = included.reduce((s, l) => s + l.gross_pay, 0)
  return {
    total_hours: Math.round(total_hours * 100) / 100,
    total_gross_pay: Math.round(total_gross_pay * 100) / 100,
    staff_count: included.length,
  }
}
