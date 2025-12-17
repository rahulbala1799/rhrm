import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/staff/[id]/availability
 * Get availability for a staff member
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const { data: availability, error } = await supabase
    .from('availability')
    .select('*')
    .eq('staff_id', params.id)
    .eq('tenant_id', tenantId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }

  return NextResponse.json({ availability: availability || [] })
}

/**
 * POST /api/staff/[id]/availability
 * Create availability for a staff member
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can create availability
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

  const body = await request.json()
  const {
    day_of_week,
    start_time,
    end_time,
    is_available,
    valid_from,
    valid_until,
  } = body

  // Validate required fields
  if (day_of_week === undefined || !start_time || !end_time) {
    return NextResponse.json(
      { error: 'Day of week, start time, and end time are required' },
      { status: 400 }
    )
  }

  // Validate day_of_week range
  if (day_of_week < 0 || day_of_week > 6) {
    return NextResponse.json(
      { error: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' },
      { status: 400 }
    )
  }

  const { data: availability, error } = await supabase
    .from('availability')
    .insert({
      tenant_id: tenantId,
      staff_id: params.id,
      day_of_week,
      start_time,
      end_time,
      is_available: is_available !== undefined ? is_available : true,
      valid_from: valid_from || null,
      valid_until: valid_until || null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error creating availability:', error)
    return NextResponse.json({ error: 'Failed to create availability' }, { status: 500 })
  }

  return NextResponse.json({ availability }, { status: 201 })
}


