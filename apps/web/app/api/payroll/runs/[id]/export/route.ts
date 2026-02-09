import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** POST /api/payroll/runs/[id]/export — Generate CSV for a run */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId, role } = await getTenantContext()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: run, error: runError } = await supabase
    .from('pay_runs')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (runError || !run) {
    return NextResponse.json({ error: 'Pay run not found' }, { status: 404 })
  }

  const { data: lines } = await supabase
    .from('pay_run_lines')
    .select('*')
    .eq('pay_run_id', id)
    .eq('status', 'included')
    .order('staff_name')

  const headers = [
    'Employee Number',
    'Staff Name',
    'Regular Hours',
    'Overtime Hours',
    'Total Hours',
    'Hourly Rate',
    'Overtime Rate',
    'Regular Pay',
    'Overtime Pay',
    'Adjustments',
    'Gross Pay',
  ]

  const rows = (lines || []).map((l: Record<string, unknown>) => [
    l.employee_number,
    l.staff_name,
    l.regular_hours,
    l.overtime_hours,
    l.total_hours,
    l.hourly_rate,
    l.overtime_rate,
    l.regular_pay,
    l.overtime_pay,
    l.adjustments,
    l.gross_pay,
  ])

  const csv = [
    headers.join(','),
    ...rows.map((row: unknown[]) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')

  const filename = `pay-run-${run.pay_period_start}-to-${run.pay_period_end}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
