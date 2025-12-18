import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/schedule/conflicts
 * Get conflict analysis for a week
 */
export async function GET(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can view conflicts
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

  // Get week boundaries
  const weekStartDate = new Date(weekStartParam + 'T00:00:00')
  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setDate(weekStartDate.getDate() + 7)

  // Get all shifts for the week
  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('id, staff_id, start_time, end_time, status')
    .eq('tenant_id', tenantId)
    .gte('start_time', weekStartDate.toISOString())
    .lt('start_time', weekEndDate.toISOString())
    .neq('status', 'cancelled')

  if (shiftsError) {
    console.error('Error fetching shifts for conflict analysis:', shiftsError)
    return NextResponse.json(
      { error: 'Failed to fetch shifts' },
      { status: 500 }
    )
  }

  const conflicts: any[] = []

  // Check for overlapping shifts
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      const shift1 = shifts[i]
      const shift2 = shifts[j]

      // Same staff and overlapping times
      if (
        shift1.staff_id === shift2.staff_id &&
        new Date(shift1.start_time) < new Date(shift2.end_time) &&
        new Date(shift1.end_time) > new Date(shift2.start_time)
      ) {
        conflicts.push({
          shift_id: shift1.id,
          type: 'overlap',
          severity: 'error',
          message: 'Shift overlaps with another shift for the same staff member',
          details: {
            overlapping_shift_id: shift2.id,
          },
        })
      }
    }
  }

  // TODO: Check availability violations and working rules violations
  // These would be soft warnings, not hard errors

  return NextResponse.json({
    conflicts,
  })
}


