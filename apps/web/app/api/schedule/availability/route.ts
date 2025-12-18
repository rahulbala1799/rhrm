import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/schedule/availability
 * Get staff availability for a week
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

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(weekStartParam)) {
    return NextResponse.json(
      { error: 'weekStart must be in format YYYY-MM-DD (no time component)' },
      { status: 400 }
    )
  }

  // Build query
  let query = supabase
    .from('availability')
    .select(`
      id,
      staff_id,
      day_of_week,
      start_time,
      end_time,
      is_available,
      valid_from,
      valid_until
    `)
    .eq('tenant_id', tenantId)

  // Filter by staff if provided (or auto-apply for staff role)
  const staffIdParam = searchParams.get('staffId')
  if (role === 'staff') {
    // Staff can only see their own availability
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (staffRecord) {
      query = query.eq('staff_id', staffRecord.id)
    } else {
      return NextResponse.json({ availability: [] })
    }
  } else if (staffIdParam) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(staffIdParam)) {
      query = query.eq('staff_id', staffIdParam)
    }
  }

  const { data: availability, error } = await query

  if (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    availability: availability || [],
  })
}

