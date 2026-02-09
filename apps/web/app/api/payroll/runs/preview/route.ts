import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { generatePayRunData, totalsFromLines } from '@/lib/payroll/generate-pay-run'

export const dynamic = 'force-dynamic'

/** POST /api/payroll/runs/preview — Preview what a run would contain (no save) */
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

  const { lines } = await generatePayRunData({
    tenantId,
    payPeriodStart: pay_period_start,
    payPeriodEnd: pay_period_end,
    createdBy: null,
    supabase,
  })

  const totals = totalsFromLines(lines)

  const { count: unapprovedCount } = await supabase
    .from('timesheets')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'submitted'])
    .gte('date', pay_period_start)
    .lte('date', pay_period_end)

  return NextResponse.json({
    period_start: pay_period_start,
    period_end: pay_period_end,
    staff_count: totals.staff_count,
    total_hours: totals.total_hours,
    estimated_gross: totals.total_gross_pay,
    unapproved_count: unapprovedCount,
  })
}
