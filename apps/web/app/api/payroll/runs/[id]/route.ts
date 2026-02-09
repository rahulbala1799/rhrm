import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** GET /api/payroll/runs/[id] — Get pay run with all lines */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId, role } = await getTenantContext()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: run, error } = await supabase
    .from('pay_runs')
    .select('*, lines:pay_run_lines(*)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !run) {
    return NextResponse.json({ error: 'Pay run not found' }, { status: 404 })
  }

  return NextResponse.json(run)
}

/** PATCH /api/payroll/runs/[id] — Update run status or notes */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId, role } = await getTenantContext()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  let body: { status?: string; notes?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: existing } = await supabase
    .from('pay_runs')
    .select('id, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Pay run not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  if (body.status !== undefined) {
    const valid = ['draft', 'reviewing', 'approved', 'finalised']
    if (!valid.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    if (body.status === 'finalised' && existing.status !== 'finalised') {
      updates.finalised_by = user?.id
      updates.finalised_at = new Date().toISOString()
    }
    if (body.status === 'approved' && existing.status !== 'approved') {
      updates.approved_by = user?.id
      updates.approved_at = new Date().toISOString()
    }
    updates.status = body.status
  }
  if (body.notes !== undefined) updates.notes = body.notes

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  const { data: run, error } = await supabase
    .from('pay_runs')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: runWithLines } = await supabase
    .from('pay_runs')
    .select('*, lines:pay_run_lines(*)')
    .eq('id', id)
    .single()

  return NextResponse.json(runWithLines || run)
}

/** DELETE /api/payroll/runs/[id] — Delete draft run only */
export async function DELETE(
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

  const { data: existing } = await supabase
    .from('pay_runs')
    .select('id, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Pay run not found' }, { status: 404 })
  }

  if (existing.status !== 'draft') {
    return NextResponse.json(
      { error: 'Only draft pay runs can be deleted' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('pay_runs')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
