import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * DELETE /api/staff/[id]/roles/[roleId]
 * Unassign a role from a staff member
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; roleId: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can unassign roles
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  // Verify staff belongs to tenant
  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  // Verify role assignment exists
  const { data: staffRole } = await supabase
    .from('staff_roles')
    .select('id')
    .eq('staff_id', params.id)
    .eq('role_id', params.roleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!staffRole) {
    return NextResponse.json({ error: 'Role assignment not found' }, { status: 404 })
  }

  // Delete the assignment
  const { error } = await supabase
    .from('staff_roles')
    .delete()
    .eq('id', staffRole.id)

  if (error) {
    console.error('Error unassigning role:', error)
    return NextResponse.json({ error: 'Failed to unassign role' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Role unassigned successfully',
  })
}

