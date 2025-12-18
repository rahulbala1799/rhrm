import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { createShiftAuditLog, isShiftStartedOrEnded, getTenantSettings } from '@/lib/schedule/utils'

/**
 * PUT /api/schedule/shifts/[id]
 * Update an existing shift
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const shiftId = params.id

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(shiftId)) {
    return NextResponse.json({ error: 'Invalid shift ID' }, { status: 400 })
  }

  // Get existing shift
  const { data: existingShift, error: fetchError } = await supabase
    .from('shifts')
    .select('*')
    .eq('id', shiftId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !existingShift) {
    return NextResponse.json(
      { error: 'Shift not found' },
      { status: 404 }
    )
  }

  // Check permissions
  const isStaff = role === 'staff'
  const isAdminOrManager = role === 'admin' || role === 'manager' || role === 'superadmin'

  if (!isStaff && !isAdminOrManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // If staff, check if it's their shift and tenant setting allows updates
  if (isStaff) {
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (!staffRecord || existingShift.staff_id !== staffRecord.id) {
      return NextResponse.json(
        { error: 'You can only update your own shifts' },
        { status: 403 }
      )
    }

    // Check tenant setting
    const settings = await getTenantSettings()
    if (!settings?.staff_can_accept_decline_shifts) {
      return NextResponse.json(
        { error: 'Staff shift accept/decline is not enabled for this tenant' },
        { status: 403 }
      )
    }

    // Staff can only change status from published to confirmed/cancelled
    const body = await request.json()
    const { status: newStatus } = body

    if (existingShift.status !== 'published') {
      return NextResponse.json(
        { error: 'You can only accept/decline published shifts' },
        { status: 403 }
      )
    }

    if (newStatus !== 'confirmed' && newStatus !== 'cancelled') {
      return NextResponse.json(
        { error: 'You can only change status to confirmed or cancelled' },
        { status: 403 }
      )
    }

    // Staff can only update status, not other fields
    const allowedFields = ['status']
    const providedFields = Object.keys(body)
    const forbiddenFields = providedFields.filter(f => !allowedFields.includes(f))

    if (forbiddenFields.length > 0) {
      return NextResponse.json(
        { error: `Staff can only update status. Forbidden fields: ${forbiddenFields.join(', ')}` },
        { status: 403 }
      )
    }
  }

  const body = await request.json()
  const updateData: any = {}

  // Validate and set fields
  if (body.staff_id !== undefined) {
    if (!uuidRegex.test(body.staff_id)) {
      return NextResponse.json(
        { error: 'Invalid UUID format for staff_id' },
        { status: 400 }
      )
    }
    updateData.staff_id = body.staff_id
  }

  if (body.location_id !== undefined) {
    if (!uuidRegex.test(body.location_id)) {
      return NextResponse.json(
        { error: 'Invalid UUID format for location_id' },
        { status: 400 }
      )
    }
    updateData.location_id = body.location_id
  }

  if (body.start_time !== undefined) {
    const startTime = new Date(body.start_time)
    if (isNaN(startTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format for start_time' },
        { status: 400 }
      )
    }
    updateData.start_time = body.start_time
  }

  if (body.end_time !== undefined) {
    const endTime = new Date(body.end_time)
    if (isNaN(endTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format for end_time' },
        { status: 400 }
      )
    }
    updateData.end_time = body.end_time
  }

  // Validate time relationship if both are provided
  const finalStartTime = updateData.start_time ? new Date(updateData.start_time) : new Date(existingShift.start_time)
  const finalEndTime = updateData.end_time ? new Date(updateData.end_time) : new Date(existingShift.end_time)

  if (finalEndTime <= finalStartTime) {
    return NextResponse.json(
      { error: 'end_time must be after start_time' },
      { status: 400 }
    )
  }

  if (body.break_duration_minutes !== undefined) {
    updateData.break_duration_minutes = body.break_duration_minutes || 0
  }

  if (body.notes !== undefined) {
    updateData.notes = body.notes || null
  }

  if (body.status !== undefined) {
    const validStatuses = ['draft', 'published', 'confirmed', 'cancelled']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }
    updateData.status = body.status
  }

  // Check for overlapping shifts if time or staff changed (hard block - 409)
  const staffIdToCheck = updateData.staff_id || existingShift.staff_id
  const startTimeToCheck = updateData.start_time || existingShift.start_time
  const endTimeToCheck = updateData.end_time || existingShift.end_time

  if (updateData.staff_id || updateData.start_time || updateData.end_time) {
    const { data: overlappingShifts } = await supabase
      .from('shifts')
      .select('id, start_time, end_time')
      .eq('tenant_id', tenantId)
      .eq('staff_id', staffIdToCheck)
      .neq('id', shiftId) // Exclude current shift
      .neq('status', 'cancelled')
      .or(`and(start_time.lt.${endTimeToCheck},end_time.gt.${startTimeToCheck})`)

    if (overlappingShifts && overlappingShifts.length > 0) {
      return NextResponse.json(
        {
          error: 'Shift overlaps with existing shift',
          conflict: {
            type: 'overlap',
            message: 'Staff already has a shift during this time',
          },
        },
        { status: 409 }
      )
    }
  }

  // Update shift
  const { data: updatedShift, error: updateError } = await supabase
    .from('shifts')
    .update(updateData)
    .eq('id', shiftId)
    .eq('tenant_id', tenantId)
    .select(`
      id,
      staff_id,
      location_id,
      start_time,
      end_time,
      break_duration_minutes,
      status,
      notes,
      created_by,
      created_at,
      updated_at,
      staff:staff_id (
        id,
        first_name,
        last_name,
        preferred_name,
        department
      ),
      location:location_id (
        id,
        name
      )
    `)
    .single()

  if (updateError) {
    console.error('Error updating shift:', updateError)
    return NextResponse.json(
      { error: 'Failed to update shift' },
      { status: 500 }
    )
  }

  // Determine action type for audit log
  let actionType: 'updated' | 'published' | 'unpublished' | 'confirmed' | 'cancelled' | 'reassigned' | 'time_changed' | 'location_changed' | 'break_changed' | 'notes_changed' = 'updated'

  if (body.status !== undefined && body.status !== existingShift.status) {
    if (body.status === 'published') actionType = 'published'
    else if (body.status === 'confirmed') actionType = 'confirmed'
    else if (body.status === 'cancelled') actionType = 'cancelled'
    else if (existingShift.status === 'published' && body.status === 'draft') actionType = 'unpublished'
  } else if (updateData.staff_id && updateData.staff_id !== existingShift.staff_id) {
    actionType = 'reassigned'
  } else if (updateData.start_time || updateData.end_time) {
    actionType = 'time_changed'
  } else if (updateData.location_id) {
    actionType = 'location_changed'
  } else if (updateData.break_duration_minutes !== undefined) {
    actionType = 'break_changed'
  } else if (updateData.notes !== undefined) {
    actionType = 'notes_changed'
  }

  // Create audit log
  const isPostStart = await isShiftStartedOrEnded(
    updatedShift.start_time,
    updatedShift.end_time
  )
  
  const message = `Updated shift: ${actionType === 'time_changed' ? 'Changed time' : actionType === 'reassigned' ? 'Reassigned shift' : actionType === 'location_changed' ? 'Changed location' : actionType === 'break_changed' ? 'Changed break duration' : actionType === 'notes_changed' ? 'Changed notes' : `Changed status to ${updatedShift.status}`}`

  await createShiftAuditLog({
    shiftId: updatedShift.id,
    actionType,
    beforeSnapshot: existingShift,
    afterSnapshot: updatedShift,
    message,
    isPostStartEdit: isPostStart,
  })

  // TODO: Check availability and working rules (soft warnings)
  const conflicts: any[] = []

  return NextResponse.json({
    ...updatedShift,
    conflicts,
  })
}

/**
 * DELETE /api/schedule/shifts/[id]
 * Delete a shift
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can delete shifts
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const shiftId = params.id

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(shiftId)) {
    return NextResponse.json({ error: 'Invalid shift ID' }, { status: 400 })
  }

  // Get existing shift for audit log
  const { data: existingShift, error: fetchError } = await supabase
    .from('shifts')
    .select('*')
    .eq('id', shiftId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !existingShift) {
    return NextResponse.json(
      { error: 'Shift not found' },
      { status: 404 }
    )
  }

  // Delete shift
  const { error: deleteError } = await supabase
    .from('shifts')
    .delete()
    .eq('id', shiftId)
    .eq('tenant_id', tenantId)

  if (deleteError) {
    console.error('Error deleting shift:', deleteError)
    return NextResponse.json(
      { error: 'Failed to delete shift' },
      { status: 500 }
    )
  }

  // Create audit log
  await createShiftAuditLog({
    shiftId: shiftId, // Keep ID for audit even though shift is deleted
    actionType: 'deleted',
    beforeSnapshot: existingShift,
    afterSnapshot: null,
    message: `Deleted shift for staff ${existingShift.staff_id}`,
    isPostStartEdit: false,
  })

  return NextResponse.json({ success: true })
}

