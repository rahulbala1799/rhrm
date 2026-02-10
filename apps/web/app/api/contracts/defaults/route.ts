import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/contracts/defaults
 * Get company contract defaults for the tenant (one row per tenant).
 */
export async function GET() {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('company_contract_defaults')
    .select('id, tenant_id, defaults_json, updated_at')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching contract defaults:', error)
    return NextResponse.json({ error: 'Failed to fetch defaults' }, { status: 500 })
  }

  return NextResponse.json({ defaults: data?.defaults_json ?? {} })
}

/**
 * PUT /api/contracts/defaults
 * Upsert company contract defaults (probation, sick, pension, notice, handbook refs, employer details).
 */
export async function PUT(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const defaultsJson = body.defaults_json ?? body

  if (typeof defaultsJson !== 'object' || defaultsJson === null) {
    return NextResponse.json({ error: 'defaults_json must be an object' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  const updatedBy = user?.data?.user?.id ?? null

  const { data, error } = await supabase
    .from('company_contract_defaults')
    .upsert(
      {
        tenant_id: tenantId,
        defaults_json: defaultsJson,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' }
    )
    .select('id, tenant_id, defaults_json, updated_at')
    .single()

  if (error) {
    console.error('Error upserting contract defaults:', error)
    return NextResponse.json({ error: 'Failed to save defaults' }, { status: 500 })
  }

  return NextResponse.json({ defaults: data.defaults_json })
}
