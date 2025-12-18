import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * DELETE /api/staff/[id]/locations/[locationId]
 * Unassign a location from a staff member
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; locationId: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can unassign locations
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

  // Verify location assignment exists
  const { data: staffLocation } = await supabase
    .from('staff_locations')
    .select('id')
    .eq('staff_id', params.id)
    .eq('location_id', params.locationId)
    .eq('tenant_id', tenantId)
    .single()

  if (!staffLocation) {
    return NextResponse.json({ error: 'Location assignment not found' }, { status: 404 })
  }

  // Delete the assignment
  const { error } = await supabase
    .from('staff_locations')
    .delete()
    .eq('id', staffLocation.id)

  if (error) {
    console.error('Error unassigning location:', error)
    return NextResponse.json({ error: 'Failed to unassign location' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Location unassigned successfully',
  })
}

