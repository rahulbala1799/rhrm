import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * PUT /api/settings/locations/[id]
 * Update a location
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can update locations
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, address, postcode, phone, settings } = body

  const supabase = await createClient()

  // Verify location belongs to tenant
  const { data: existing } = await supabase
    .from('locations')
    .select('id, tenant_id')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  const updates: any = {}
  if (name !== undefined) updates.name = name
  if (address !== undefined) updates.address = address
  if (postcode !== undefined) updates.postcode = postcode
  if (phone !== undefined) updates.phone = phone
  if (settings !== undefined) {
    // Merge with existing settings
    updates.settings = { ...(existing.settings || {}), ...settings }
  }

  const { data: location, error } = await supabase
    .from('locations')
    .update(updates)
    .eq('id', params.id)
    .select('id, name, address, postcode, phone, settings, updated_at')
    .single()

  if (error) {
    console.error('Error updating location:', error)
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }

  return NextResponse.json({ location })
}

/**
 * DELETE /api/settings/locations/[id]
 * Delete a location
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin can delete locations
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  // Verify location belongs to tenant
  const { data: existing } = await supabase
    .from('locations')
    .select('id, tenant_id')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  // Check if location is in use by staff or shifts
  const { data: staffUsing } = await supabase
    .from('staff')
    .select('id')
    .eq('location_id', params.id)
    .limit(1)
    .single()

  if (staffUsing) {
    return NextResponse.json(
      { error: 'Cannot delete location: staff members are assigned to it' },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', params.id)

  if (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

