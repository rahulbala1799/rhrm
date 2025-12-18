import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * PUT /api/staff/[id]/availability/[availabilityId]
 * Update an availability slot
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string; availabilityId: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can update availability
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const body = await request.json()
  const {
    day_of_week,
    start_time,
    end_time,
    is_available,
    valid_from,
    valid_until,
  } = body

  const updateData: any = {}
  if (day_of_week !== undefined) {
    if (day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json(
        { error: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' },
        { status: 400 }
      )
    }
    updateData.day_of_week = day_of_week
  }
  if (start_time !== undefined) updateData.start_time = start_time
  if (end_time !== undefined) updateData.end_time = end_time
  if (is_available !== undefined) updateData.is_available = is_available
  if (valid_from !== undefined) updateData.valid_from = valid_from
  if (valid_until !== undefined) updateData.valid_until = valid_until

  const { data: availability, error } = await supabase
    .from('availability')
    .update(updateData)
    .eq('id', params.availabilityId)
    .eq('staff_id', params.id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating availability:', error)
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
  }

  return NextResponse.json({ availability })
}

/**
 * DELETE /api/staff/[id]/availability/[availabilityId]
 * Delete an availability slot
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; availabilityId: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can delete availability
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('availability')
    .delete()
    .eq('id', params.availabilityId)
    .eq('staff_id', params.id)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('Error deleting availability:', error)
    return NextResponse.json({ error: 'Failed to delete availability' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}



