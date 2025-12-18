import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { createShiftAuditLog, isShiftStartedOrEnded } from '@/lib/schedule/utils'

/**
 * POST /api/schedule/shifts
 * Create a new shift
 */
export async function POST(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can create shifts
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const body = await request.json()

  // Validate required fields
  const { staff_id, location_id, start_time, end_time, break_duration_minutes, notes, status } = body

  if (!staff_id || !location_id || !start_time || !end_time) {
    return NextResponse.json(
      { error: 'Missing required fields: staff_id, location_id, start_time, end_time' },
      { status: 400 }
    )
  }

  // Validate UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(staff_id) || !uuidRegex.test(location_id)) {
    return NextResponse.json(
      { error: 'Invalid UUID format for staff_id or location_id' },
      { status: 400 }
    )
  }

  // Validate times
  const startTime = new Date(start_time)
  const endTime = new Date(end_time)

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date format for start_time or end_time' },
      { status: 400 }
    )
  }

  if (endTime <= startTime) {
    return NextResponse.json(
      { error: 'end_time must be after start_time' },
      { status: 400 }
    )
  }

  // Validate duration (minimum 15 minutes)
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
  if (durationMinutes < 15) {
    return NextResponse.json(
      { error: 'Shift duration must be at least 15 minutes' },
      { status: 400 }
    )
  }

  // Verify staff and location belong to tenant
  const { data: staffRecord } = await supabase
    .from('staff')
    .select('id')
    .eq('id', staff_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!staffRecord) {
    return NextResponse.json(
      { error: 'Staff member not found or not in tenant' },
      { status: 404 }
    )
  }

  const { data: locationRecord } = await supabase
    .from('locations')
    .select('id')
    .eq('id', location_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!locationRecord) {
    return NextResponse.json(
      { error: 'Location not found or not in tenant' },
      { status: 404 }
    )
  }

  // Check for overlapping shifts (hard block - 409)
  const { data: overlappingShifts } = await supabase
    .from('shifts')
    .select('id, start_time, end_time')
    .eq('tenant_id', tenantId)
    .eq('staff_id', staff_id)
    .neq('status', 'cancelled')
    .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`)

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

  // Get user for created_by
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Create shift
  const { data: shift, error: insertError } = await supabase
    .from('shifts')
    .insert({
      tenant_id: tenantId,
      staff_id,
      location_id,
      start_time: start_time,
      end_time: end_time,
      break_duration_minutes: break_duration_minutes || 0,
      notes: notes || null,
      status: status || 'draft',
      created_by: user?.id || null,
    })
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

  if (insertError) {
    console.error('Error creating shift:', insertError)
    return NextResponse.json(
      { error: 'Failed to create shift' },
      { status: 500 }
    )
  }

  // Transform response to flatten relations (Supabase returns relations as arrays)
  const staff = Array.isArray(shift.staff) ? shift.staff[0] : shift.staff
  const location = Array.isArray(shift.location) ? shift.location[0] : shift.location
  
  const transformedShift = {
    ...shift,
    staff: staff || null,
    location: location || null,
  }

  // Create audit log
  const isPostStart = await isShiftStartedOrEnded(start_time, end_time)
  const staffName = staff 
    ? `${staff.first_name} ${staff.last_name}`
    : 'staff member'
  await createShiftAuditLog({
    shiftId: shift.id,
    actionType: 'created',
    beforeSnapshot: null,
    afterSnapshot: transformedShift,
    message: `Created shift for ${staffName} from ${new Date(start_time).toLocaleString()} to ${new Date(end_time).toLocaleString()}`,
    isPostStartEdit: isPostStart,
  })

  // TODO: Check availability and working rules (soft warnings)
  // For now, return empty conflicts array
  const conflicts: any[] = []

  return NextResponse.json({
    ...transformedShift,
    conflicts,
  })
}

