// Pay run types — see PAY_RUNS_DESIGN.md

export type PayRunStatus = 'draft' | 'reviewing' | 'approved' | 'finalised'
export type PayRunLineStatus = 'included' | 'excluded'

export interface PayRun {
  id: string
  tenant_id: string
  pay_period_start: string
  pay_period_end: string
  status: PayRunStatus
  name: string
  notes: string | null
  total_hours: number
  total_gross_pay: number
  staff_count: number
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  finalised_by: string | null
  finalised_at: string | null
  created_at: string
  updated_at: string
}

export interface PayRunLine {
  id: string
  pay_run_id: string
  tenant_id: string
  staff_id: string
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
  adjustment_reason: string | null
  gross_pay: number
  status: PayRunLineStatus
  timesheet_ids: string[]
  created_at: string
  updated_at: string
}

export interface PayRunChange {
  id: string
  pay_run_id: string
  tenant_id: string
  pay_run_line_id: string | null
  field_changed: string
  old_value: string | null
  new_value: string | null
  reason: string | null
  changed_by: string
  created_at: string
}

export interface PayRunWithLines extends PayRun {
  lines: PayRunLine[]
}

export interface CreatePayRunInput {
  pay_period_start: string // YYYY-MM-DD
  pay_period_end: string   // YYYY-MM-DD
}

export interface PreviewPayRunResponse {
  staff_count: number
  total_hours: number
  estimated_gross: number
  unapproved_count: number
  period_start: string
  period_end: string
}
