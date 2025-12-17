import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/staff/[id]
 * Get a specific staff member
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
    .select(`
      id,
      employee_number,
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      national_insurance_number,
      employment_type,
      employment_start_date,
      employment_end_date,
      hourly_rate,
      status,
      created_at,
      updated_at,
      location_id,
      locations(id, name, address, postcode)
    `)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  return NextResponse.json({ staff })
}

/**
 * PUT /api/staff/[id]
 * Update a staff member
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can update staff
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const {
    employee_number,
    first_name,
    last_name,
    email,
    phone,
    date_of_birth,
    national_insurance_number,
    employment_type,
    employment_start_date,
    employment_end_date,
    hourly_rate,
    location_id,
    status,
  } = body

  const supabase = await createClient()

  // Check if employee number is being changed and if it's unique
  if (employee_number) {
    const { data: existing } = await supabase
      .from('staff')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('employee_number', employee_number)
      .neq('id', params.id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Employee number already exists' },
        { status: 409 }
      )
    }
  }

  const updateData: any = {}
  if (employee_number !== undefined) updateData.employee_number = employee_number
  if (first_name !== undefined) updateData.first_name = first_name
  if (last_name !== undefined) updateData.last_name = last_name
  if (email !== undefined) updateData.email = email
  if (phone !== undefined) updateData.phone = phone
  if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth
  if (national_insurance_number !== undefined) updateData.national_insurance_number = national_insurance_number
  if (employment_type !== undefined) updateData.employment_type = employment_type
  if (employment_start_date !== undefined) updateData.employment_start_date = employment_start_date
  if (employment_end_date !== undefined) updateData.employment_end_date = employment_end_date
  if (hourly_rate !== undefined) updateData.hourly_rate = hourly_rate
  if (location_id !== undefined) updateData.location_id = location_id
  if (status !== undefined) updateData.status = status

  const { data: staff, error } = await supabase
    .from('staff')
    .update(updateData)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select(`
      id,
      employee_number,
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      employment_type,
      employment_start_date,
      employment_end_date,
      hourly_rate,
      status,
      updated_at,
      location_id,
      locations(id, name)
    `)
    .single()

  if (error) {
    console.error('Error updating staff:', error)
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
  }

  return NextResponse.json({ staff })
}

/**
 * DELETE /api/staff/[id]
 * Delete a staff member
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin can delete staff
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('Error deleting staff:', error)
    return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

