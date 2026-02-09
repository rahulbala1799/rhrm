import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** GET /api/payroll/runs/[id]/changes — Get change log for a run */
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

  const { data: run } = await supabase
    .from('pay_runs')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!run) {
    return NextResponse.json({ error: 'Pay run not found' }, { status: 404 })
  }

  const { data: changes, error } = await supabase
    .from('pay_run_changes')
    .select('*, changed_by_profile:profiles!changed_by(full_name, email)')
    .eq('pay_run_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ changes: changes || [] })
}
