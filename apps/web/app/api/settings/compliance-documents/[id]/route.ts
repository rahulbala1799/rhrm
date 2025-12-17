import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * PUT /api/settings/compliance-documents/[id]
 * Update requirement (admin only)
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const updates: any = {}

  // Build updates object with only provided fields
  if (body.title !== undefined) updates.title = body.title
  if (body.requirement_level !== undefined) updates.requirement_level = body.requirement_level
  if (body.collection_method !== undefined) updates.collection_method = body.collection_method
  if (body.expires_in_months !== undefined) updates.expires_in_months = body.expires_in_months
  if (body.applies_to_all !== undefined) updates.applies_to_all = body.applies_to_all
  if (body.role_ids !== undefined) updates.role_ids = body.role_ids
  if (body.location_ids !== undefined) updates.location_ids = body.location_ids
  if (body.is_enabled !== undefined) updates.is_enabled = body.is_enabled
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: requirement, error } = await supabase
    .from('tenant_compliance_requirements')
    .update(updates)
    .eq('id', params.id)
    .eq('tenant_id', tenantId) // Ensure user can only update their tenant's requirements
    .select()
    .single()

  if (error) {
    console.error('Error updating requirement:', error)
    return NextResponse.json({ error: 'Failed to update requirement' }, { status: 500 })
  }

  if (!requirement) {
    return NextResponse.json({ error: 'Requirement not found' }, { status: 404 })
  }

  return NextResponse.json({ requirement })
}

/**
 * DELETE /api/settings/compliance-documents/[id]
 * Delete requirement (admin only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('tenant_compliance_requirements')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', tenantId) // Ensure user can only delete their tenant's requirements

  if (error) {
    console.error('Error deleting requirement:', error)
    return NextResponse.json({ error: 'Failed to delete requirement' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

