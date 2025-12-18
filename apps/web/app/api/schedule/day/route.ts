import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { getTenantSettings } from '@/lib/schedule/utils'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

/**
 * GET /api/schedule/day
 * Fetch all shifts for a specific day
 */
export async function GET(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Validate date format (YYYY-MM-DD only)
  const dateParam = searchParams.get('date')
  if (!dateParam) {
    return NextResponse.json(
      { error: 'date parameter is required (format: YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  // Validate format - must be YYYY-MM-DD (no time component)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateParam)) {
    return NextResponse.json(
      { error: 'date must be in format YYYY-MM-DD (no time component)' },
      { status: 400 }
    )
  }

  // Validate it's a valid date
  const dateObj = new Date(dateParam + 'T00:00:00')
  if (isNaN(dateObj.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date' },
      { status: 400 }
    )
  }

  // Get tenant timezone
  const settings = await getTenantSettings()
  const timezone = settings?.timezone || 'UTC'

  // Get day boundaries in tenant timezone, then convert to UTC
  // Day starts at 00:00:00 and ends at 23:59:59.999 in tenant timezone
  const [year, month, day] = dateParam.split('-').map(Number)
  const dayStartLocal = new Date(year, month - 1, day, 0, 0, 0, 0)
  const dayEndLocal = new Date(year, month - 1, day, 23, 59, 59, 999)
  
  // Convert to UTC for database query
  const dayStartUTC = fromZonedTime(dayStartLocal, timezone)
  // For end time, we use next day 00:00:00 exclusive (as per spec: end_time is exclusive)
  const nextDayLocal = new Date(year, month - 1, day + 1, 0, 0, 0, 0)
  const dayEndUTC = fromZonedTime(nextDayLocal, timezone)

  // Build query - get shifts that start on this day OR overlap with this day
  // A shift overlaps if: start_time < dayEndUTC AND end_time > dayStartUTC
  let query = supabase
    .from('shifts')
    .select(`
      id,
      staff_id,
      location_id,
      role_id,
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
      ),
      job_roles:role_id (
        id,
        name,
        bg_color,
        text_color
      )
    `)
    .eq('tenant_id', tenantId)
    .lt('start_time', dayEndUTC.toISOString())
    .gt('end_time', dayStartUTC.toISOString())

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
      return NextResponse.json({
        date: dateParam,
        shifts: [],
        conflicts: [],
        totals: {
          totalShifts: 0,
          totalStaff: 0,
          totalHours: 0,
          totalCost: 0,
          overtimeCost: 0,
        },
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

  // Transform shifts to flatten relations
  const transformedShifts = (shifts || []).map((shift: any) => ({
    ...shift,
    staff: Array.isArray(shift.staff) ? shift.staff[0] || null : shift.staff || null,
    location: Array.isArray(shift.location) ? shift.location[0] || null : shift.location || null,
    role: Array.isArray(shift.job_roles) ? shift.job_roles[0] || null : shift.job_roles || null,
  }))

  // Filter shifts to only include those that actually appear on this day
  // A shift appears on a day if its start_time (in tenant timezone) falls on that day
  const dayShifts = transformedShifts.filter((shift: any) => {
    const shiftStartLocal = toZonedTime(new Date(shift.start_time), timezone)
    return (
      shiftStartLocal.getFullYear() === year &&
      shiftStartLocal.getMonth() === month - 1 &&
      shiftStartLocal.getDate() === day
    )
  })

  // Detect conflicts (overlapping shifts for same staff)
  const conflicts: Array<{
    shift_id: string
    type: string
    message: string
  }> = []

  for (let i = 0; i < dayShifts.length; i++) {
    for (let j = i + 1; j < dayShifts.length; j++) {
      const shift1 = dayShifts[i]
      const shift2 = dayShifts[j]

      // Check if same staff and overlapping
      if (
        shift1.staff_id === shift2.staff_id &&
        shift1.status !== 'cancelled' &&
        shift2.status !== 'cancelled'
      ) {
        const start1 = new Date(shift1.start_time).getTime()
        const end1 = new Date(shift1.end_time).getTime()
        const start2 = new Date(shift2.start_time).getTime()
        const end2 = new Date(shift2.end_time).getTime()

        // Overlap check: start1 < end2 AND start2 < end1 (inclusive start, exclusive end)
        if (start1 < end2 && start2 < end1) {
          conflicts.push({
            shift_id: shift1.id,
            type: 'overlap',
            message: `Overlaps with another shift`,
          })
          conflicts.push({
            shift_id: shift2.id,
            type: 'overlap',
            message: `Overlaps with another shift`,
          })
        }
      }
    }
  }

  // Calculate totals
  const totalShifts = dayShifts.filter((s: any) => s.status !== 'cancelled').length
  const uniqueStaff = new Set(dayShifts.filter((s: any) => s.status !== 'cancelled').map((s: any) => s.staff_id)).size
  
  // Calculate total hours (excluding cancelled)
  const totalHours = dayShifts
    .filter((s: any) => s.status !== 'cancelled')
    .reduce((sum: number, shift: any) => {
      const start = new Date(shift.start_time).getTime()
      const end = new Date(shift.end_time).getTime()
      const hours = (end - start) / (1000 * 60 * 60) - (shift.break_duration_minutes || 0) / 60
      return sum + Math.max(0, hours)
    }, 0)

  return NextResponse.json({
    date: dateParam,
    shifts: dayShifts,
    conflicts,
    totals: {
      totalShifts,
      totalStaff: uniqueStaff,
      totalHours: Math.round(totalHours * 100) / 100,
      totalCost: 0, // Will be calculated on client with hourly rates
      overtimeCost: 0, // Will be calculated on client with overtime rules
    },
  })
}

