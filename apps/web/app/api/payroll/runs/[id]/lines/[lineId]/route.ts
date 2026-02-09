import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** PATCH /api/payroll/runs/[id]/lines/[lineId] — Edit a line (adjustments, status) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const { tenantId, role } = await getTenantContext()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: payRunId, lineId } = await params
  let body: { adjustments?: number; adjustment_reason?: string; status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: run } = await supabase
    .from('pay_runs')
    .select('id, status')
    .eq('id', payRunId)
    .eq('tenant_id', tenantId)
    .single()

  if (!run) {
    return NextResponse.json({ error: 'Pay run not found' }, { status: 404 })
  }

  if (run.status === 'finalised') {
    return NextResponse.json(
      { error: 'Cannot edit a finalised pay run' },
      { status: 400 }
    )
  }

  const { data: line } = await supabase
    .from('pay_run_lines')
    .select('*')
    .eq('id', lineId)
    .eq('pay_run_id', payRunId)
    .eq('tenant_id', tenantId)
    .single()

  if (!line) {
    return NextResponse.json({ error: 'Line not found' }, { status: 404 })
  }

  const requireReason = run.status === 'approved'
  const hasAdjustmentChange = body.adjustments !== undefined
  if (requireReason && hasAdjustmentChange && body.adjustments !== 0 && !body.adjustment_reason?.trim()) {
    return NextResponse.json(
      { error: 'Reason is required when editing an approved run' },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {}

  if (body.adjustments !== undefined) {
    const oldVal = String(line.adjustments)
    const newVal = String(body.adjustments)
    if (oldVal !== newVal) {
      await supabase.from('pay_run_changes').insert({
        pay_run_id: payRunId,
        tenant_id: tenantId,
        pay_run_line_id: lineId,
        field_changed: 'adjustments',
        old_value: oldVal,
        new_value: newVal,
        reason: body.adjustment_reason || null,
        changed_by: user?.id,
      })
    }
    updates.adjustments = body.adjustments
    updates.adjustment_reason = body.adjustment_reason ?? null
  }

  if (body.adjustment_reason !== undefined && body.adjustments === undefined) {
    updates.adjustment_reason = body.adjustment_reason
  }

  if (body.status !== undefined && ['included', 'excluded'].includes(body.status)) {
    const oldVal = line.status
    if (oldVal !== body.status) {
      await supabase.from('pay_run_changes').insert({
        pay_run_id: payRunId,
        tenant_id: tenantId,
        pay_run_line_id: lineId,
        field_changed: 'status',
        old_value: oldVal,
        new_value: body.status,
        reason: body.adjustment_reason || null,
        changed_by: user?.id,
      })
    }
    updates.status = body.status
  }

  if (Object.keys(updates).length === 0) {
    const { data: runWithLines } = await supabase
      .from('pay_runs')
      .select('*, lines:pay_run_lines(*)')
      .eq('id', payRunId)
      .single()
    return NextResponse.json(runWithLines)
  }

  const newGross =
    Number(line.regular_pay) +
    Number(line.overtime_pay) +
    Number(updates.adjustments ?? line.adjustments)
  updates.gross_pay = Math.round(newGross * 100) / 100

  const { error } = await supabase
    .from('pay_run_lines')
    .update(updates)
    .eq('id', lineId)
    .eq('pay_run_id', payRunId)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: runWithLines } = await supabase
    .from('pay_runs')
    .select('*, lines:pay_run_lines(*)')
    .eq('id', payRunId)
    .single()

  return NextResponse.json(runWithLines)
}
