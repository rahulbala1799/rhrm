import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/staff/[id]/wages
 * Get wage information for a staff member
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

  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, first_name, last_name, hourly_rate, employment_type')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching wages:', error)
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  return NextResponse.json({ 
    wages: {
      staff_id: staff.id,
      first_name: staff.first_name,
      last_name: staff.last_name,
      hourly_rate: staff.hourly_rate,
      employment_type: staff.employment_type,
    }
  })
}

/**
 * PUT /api/staff/[id]/wages
 * Update wage information for a staff member
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can update wages
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const body = await request.json()
  const { hourly_rate } = body

  if (hourly_rate === undefined) {
    return NextResponse.json(
      { error: 'Hourly rate is required' },
      { status: 400 }
    )
  }

  // Validate hourly_rate is a positive number
  if (hourly_rate !== null && (isNaN(hourly_rate) || hourly_rate < 0)) {
    return NextResponse.json(
      { error: 'Hourly rate must be a positive number' },
      { status: 400 }
    )
  }

  const { data: staff, error } = await supabase
    .from('staff')
    .update({ hourly_rate })
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select('id, first_name, last_name, hourly_rate, employment_type, updated_at')
    .single()

  if (error) {
    console.error('Error updating wages:', error)
    return NextResponse.json({ error: 'Failed to update wages' }, { status: 500 })
  }

  return NextResponse.json({ 
    wages: {
      staff_id: staff.id,
      first_name: staff.first_name,
      last_name: staff.last_name,
      hourly_rate: staff.hourly_rate,
      employment_type: staff.employment_type,
      updated_at: staff.updated_at,
    }
  })
}

