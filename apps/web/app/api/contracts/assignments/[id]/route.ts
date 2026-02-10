import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/contracts/assignments/[id]
 * Get one contract assignment (staff can only get own; admin/manager any in tenant).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = await getTenantContext()
  const { id } = await params

  if (!tenantId || !id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contract_assignments')
    .select(`
      id,
      staff_id,
      template_id,
      template_version,
      status,
      generation_input_json,
      rendered_output_storage_path,
      signed_upload_storage_path,
      created_at,
      issued_at,
      viewed_at,
      signed_at,
      uploaded_at,
      admin_verified_at,
      contract_templates ( id, name, template_id ),
      staff ( id, first_name, last_name, email )
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  return NextResponse.json({ assignment: data })
}

/**
 * PATCH /api/contracts/assignments/[id]
 * Update status only (viewed, signed, uploaded, admin_verified). Staff can set viewed/signed/uploaded on own; admin can set admin_verified.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId, role } = await getTenantContext()
  const { id } = await params

  if (!tenantId || !id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { status: newStatus } = body

  const allowed = ['viewed', 'signed', 'uploaded', 'admin_verified']
  if (!newStatus || !allowed.includes(newStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from('contract_assignments')
    .select('id, staff_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!assignment?.data) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  const { data: user } = await supabase.auth.getUser()
  const userId = user?.data?.user?.id

  const staffRow = await supabase
    .from('staff')
    .select('user_id')
    .eq('id', assignment.data.staff_id)
    .single()

  const isOwn = staffRow.data?.user_id === userId
  const isAdminOrManager = role === 'admin' || role === 'manager'

  if (newStatus === 'admin_verified') {
    if (!isAdminOrManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else {
    if (!isOwn && !isAdminOrManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const updates: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'viewed') updates.viewed_at = new Date().toISOString()
  if (newStatus === 'signed') updates.signed_at = new Date().toISOString()
  if (newStatus === 'uploaded') updates.uploaded_at = new Date().toISOString()
  if (newStatus === 'admin_verified') {
    updates.admin_verified_at = new Date().toISOString()
    updates.admin_verified_by = userId
  }

  const { data, error } = await supabase
    .from('contract_assignments')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) {
    console.error('Error updating assignment:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ assignment: data })
}
