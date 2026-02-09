// Generate pay run from approved timesheets — see PAY_RUNS_DESIGN.md

import { SupabaseClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { getRatesForStaffBatch, findRateForDate } from '@/lib/staff-rates/utils'
import { calculateOvertimeForLine } from './overtime'
import type { PayRunLine } from './types'

export interface GeneratePayRunOptions {
  tenantId: string
  payPeriodStart: string // YYYY-MM-DD
  payPeriodEnd: string   // YYYY-MM-DD
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
  timesheet_ids: string[]
}

function buildRunName(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart + 'T00:00:00')
  const end = new Date(periodEnd + 'T00:00:00')
  return `${format(start, 'd MMM')} to ${format(end, 'd MMM yyyy')}`
}

/**
 * Fetch approved timesheets in range, group by staff, and build line data.
 * Does not insert — returns run payload and lines for caller to insert.
 */
export async function generatePayRunData(
  options: GeneratePayRunOptions
): Promise<{ name: string; lines: GeneratedLine[]; timesheetIdsByStaff: Map<string, string[]> }> {
  const { tenantId, payPeriodStart, payPeriodEnd, supabase } = options

  const { data: timesheets, error: tsError } = await supabase
    .from('timesheets')
    .select('id, staff_id, date, total_hours')
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .gte('date', payPeriodStart)
    .lte('date', payPeriodEnd)

  if (tsError) throw new Error(tsError.message)

  const byStaff = new Map<string, { totalHours: number; ids: string[] }>()
  for (const ts of timesheets || []) {
    const hours = Number(ts.total_hours) || 0
    const existing = byStaff.get(ts.staff_id)
    if (existing) {
      existing.totalHours += hours
      existing.ids.push(ts.id)
    } else {
      byStaff.set(ts.staff_id, { totalHours: hours, ids: [ts.id] })
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

    const { totalHours, ids } = byStaff.get(staffId)!
    timesheetIdsByStaff.set(staffId, ids)

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
      timesheet_ids: ids,
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
