import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/contracts/role-defaults
 * List role -> default template mapping for the tenant.
 */
export async function GET() {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contract_templates_roles')
    .select(`
      id,
      job_role_id,
      template_id,
      is_default,
      contract_templates ( id, template_id, name )
    `)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('Error fetching role defaults:', error)
    return NextResponse.json({ error: 'Failed to fetch role defaults' }, { status: 500 })
  }

  return NextResponse.json({ role_defaults: data ?? [] })
}

/**
 * PUT /api/contracts/role-defaults
 * Set default template for a job role. Body: { job_role_id, template_id }.
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
  const { job_role_id, template_id } = body

  if (!job_role_id || !template_id) {
    return NextResponse.json({ error: 'job_role_id and template_id required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contract_templates_roles')
    .upsert(
      {
        tenant_id: tenantId,
        job_role_id,
        template_id,
        is_default: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,job_role_id' }
    )
    .select('id, job_role_id, template_id, is_default')
    .single()

  if (error) {
    console.error('Error upserting role default:', error)
    return NextResponse.json({ error: 'Failed to save role default' }, { status: 500 })
  }

  return NextResponse.json({ role_default: data, success: true })
}
