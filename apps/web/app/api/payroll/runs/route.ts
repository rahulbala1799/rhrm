import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { generatePayRunData, totalsFromLines } from '@/lib/payroll/generate-pay-run'

export const dynamic = 'force-dynamic'

/** GET /api/payroll/runs — List pay runs (paginated, filter by status) */
export async function GET(request: Request) {
  const { tenantId, role } = await getTenantContext()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(50, Math.max(10, parseInt(searchParams.get('pageSize') || '20', 10)))
  const offset = (page - 1) * pageSize

  const supabase = await createClient()
  let q = supabase
    .from('pay_runs')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('pay_period_start', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (status && ['draft', 'reviewing', 'approved', 'finalised'].includes(status)) {
    q = q.eq('status', status)
  }

  const { data: runs, error, count } = await q

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    runs: runs || [],
    total: count ?? 0,
    page,
    pageSize,
  })
}

/** POST /api/payroll/runs — Create and generate a new pay run */
export async function POST(request: Request) {
  const { tenantId, role } = await getTenantContext()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { pay_period_start: string; pay_period_end: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { pay_period_start, pay_period_end } = body
  if (!pay_period_start || !pay_period_end) {
    return NextResponse.json(
      { error: 'pay_period_start and pay_period_end required (YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const createdBy = user?.id ?? null

  const existing = await supabase
    .from('pay_runs')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('pay_period_start', pay_period_start)
    .eq('pay_period_end', pay_period_end)
    .neq('status', 'draft')
    .maybeSingle()

  if (existing.data) {
    return NextResponse.json(
      { error: 'A non-draft pay run already exists for this period' },
      { status: 409 }
    )
  }

  const duplicateDraft = await supabase
    .from('pay_runs')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('pay_period_start', pay_period_start)
    .eq('pay_period_end', pay_period_end)
    .eq('status', 'draft')
    .maybeSingle()

  if (duplicateDraft.data) {
    return NextResponse.json(
      { error: 'A draft pay run already exists for this period' },
      { status: 409 }
    )
  }

  const { name, lines } = await generatePayRunData({
    tenantId,
    payPeriodStart: pay_period_start,
    payPeriodEnd: pay_period_end,
    createdBy,
    supabase,
  })

  const totals = totalsFromLines(lines)

  const { data: run, error: runError } = await supabase
    .from('pay_runs')
    .insert({
      tenant_id: tenantId,
      pay_period_start,
      pay_period_end,
      status: 'draft',
      name,
      total_hours: totals.total_hours,
      total_gross_pay: totals.total_gross_pay,
      staff_count: totals.staff_count,
      created_by: createdBy,
    })
    .select()
    .single()

  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

  const lineRows = lines.map((l) => ({
    pay_run_id: run.id,
    tenant_id: run.tenant_id,
    staff_id: l.staff_id,
    employee_number: l.employee_number,
    staff_name: l.staff_name,
    regular_hours: l.regular_hours,
    overtime_hours: l.overtime_hours,
    total_hours: l.total_hours,
    hourly_rate: l.hourly_rate,
    overtime_rate: l.overtime_rate,
    regular_pay: l.regular_pay,
    overtime_pay: l.overtime_pay,
    adjustments: 0,
    adjustment_reason: null,
    gross_pay: l.gross_pay,
    status: 'included',
    timesheet_ids: l.timesheet_ids,
  }))

  if (lineRows.length > 0) {
    const { error: linesError } = await supabase.from('pay_run_lines').insert(lineRows)
    if (linesError) {
      await supabase.from('pay_runs').delete().eq('id', run.id)
      return NextResponse.json({ error: linesError.message }, { status: 500 })
    }
  }

  await supabase.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: createdBy,
    action: 'create',
    resource_type: 'pay_run',
    resource_id: run.id,
    changes: { pay_period_start, pay_period_end, staff_count: totals.staff_count },
  })

  const { data: runWithLines } = await supabase
    .from('pay_runs')
    .select('*, lines:pay_run_lines(*)')
    .eq('id', run.id)
    .single()

  return NextResponse.json(runWithLines || run)
}
