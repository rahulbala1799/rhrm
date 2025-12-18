import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { getWeekStartUTC, getWeekEndDate } from '@/lib/schedule/utils'

/**
 * GET /api/schedule/week
 * Fetch all shifts for a given week
 */
export async function GET(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Validate weekStart format (YYYY-MM-DD only)
  const weekStartParam = searchParams.get('weekStart')
  if (!weekStartParam) {
    return NextResponse.json(
      { error: 'weekStart parameter is required (format: YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  // Validate format - must be YYYY-MM-DD (no time component)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(weekStartParam)) {
    return NextResponse.json(
      { error: 'weekStart must be in format YYYY-MM-DD (no time component)' },
      { status: 400 }
    )
  }

  // Validate it's a valid date
  const weekStartDate = new Date(weekStartParam + 'T00:00:00')
  if (isNaN(weekStartDate.getTime())) {
    return NextResponse.json(
      { error: 'Invalid weekStart date' },
      { status: 400 }
    )
  }

  // Get week boundaries in UTC
  const weekStartUTC = await getWeekStartUTC(weekStartParam)
  const weekEndUTC = new Date(weekStartUTC)
  weekEndUTC.setDate(weekStartUTC.getDate() + 7) // Add 7 days for exclusive boundary

  // Build query
  let query = supabase
    .from('shifts')
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
    .eq('tenant_id', tenantId)
    .gte('start_time', weekStartUTC.toISOString())
    .lt('start_time', weekEndUTC.toISOString())

  // Filter by location if provided
  const locationId = searchParams.get('locationId')
  if (locationId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(locationId)) {
      query = query.eq('location_id', locationId)
    }
  }

  // Filter by staff if provided (or auto-apply for staff role)
  const staffIdParam = searchParams.get('staffId')
  if (role === 'staff') {
    // Staff can only see their own shifts
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (staffRecord) {
      query = query.eq('staff_id', staffRecord.id)
    } else {
      // Staff member has no staff record, return empty
      const weekEndDate = await getWeekEndDate(weekStartParam)
      return NextResponse.json({
        shifts: [],
        weekStart: weekStartParam,
        weekEnd: weekEndDate,
        note: 'weekEnd is inclusive Sunday label in tenant timezone; internal query uses exclusive next-Monday boundary',
        conflicts: [],
      })
    }
  } else if (staffIdParam) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(staffIdParam)) {
      query = query.eq('staff_id', staffIdParam)
    }
  }

  // Filter by status if provided
  const statusParam = searchParams.get('status')
  const validStatuses = ['draft', 'published', 'confirmed', 'cancelled']
  if (statusParam && validStatuses.includes(statusParam)) {
    query = query.eq('status', statusParam)
  }

  // Exclude cancelled by default unless includeCancelled=true
  const includeCancelled = searchParams.get('includeCancelled') === 'true'
  if (!includeCancelled && (role === 'admin' || role === 'manager' || role === 'superadmin')) {
    query = query.neq('status', 'cancelled')
  } else if (!includeCancelled) {
    // Staff never see cancelled shifts
    query = query.neq('status', 'cancelled')
  }

  // Order by start_time
  query = query.order('start_time', { ascending: true })

  const { data: shifts, error } = await query

  if (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shifts' },
      { status: 500 }
    )
  }

  // Transform shifts to flatten relations (Supabase returns relations as arrays)
  const transformedShifts = (shifts || []).map((shift: any) => ({
    ...shift,
    staff: Array.isArray(shift.staff) ? shift.staff[0] || null : shift.staff || null,
    location: Array.isArray(shift.location) ? shift.location[0] || null : shift.location || null,
  }))

  // Get week end date for response
  const weekEndDate = await getWeekEndDate(weekStartParam)

  // TODO: Implement conflict detection
  // For now, return empty conflicts array
  const conflicts: any[] = []

  return NextResponse.json({
    shifts: transformedShifts,
    weekStart: weekStartParam,
    weekEnd: weekEndDate,
    note: 'weekEnd is inclusive Sunday label in tenant timezone; internal query uses exclusive next-Monday boundary',
    conflicts,
  })
}

