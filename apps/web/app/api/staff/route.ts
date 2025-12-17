import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/staff
 * Get all staff members for the tenant
 */
export async function GET(request: Request) {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const status = searchParams.get('status')
  const locationId = searchParams.get('location_id')

  let query = supabase
    .from('staff')
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
      created_at,
      updated_at,
      location_id,
      locations(id, name, address)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  // Apply filters
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,employee_number.ilike.%${search}%`)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (locationId) {
    query = query.eq('location_id', locationId)
  }

  const { data: staff, error } = await query

  if (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }

  return NextResponse.json({ staff: staff || [] })
}

/**
 * POST /api/staff
 * Create a new staff member
 */
export async function POST(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can create staff
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

  // Validate required fields
  if (!employee_number || !first_name || !last_name) {
    return NextResponse.json(
      { error: 'Employee number, first name, and last name are required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Check if employee number already exists for this tenant
  const { data: existing } = await supabase
    .from('staff')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('employee_number', employee_number)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Employee number already exists' },
      { status: 409 }
    )
  }

  const { data: staff, error } = await supabase
    .from('staff')
    .insert({
      tenant_id: tenantId,
      employee_number,
      first_name,
      last_name,
      email: email || null,
      phone: phone || null,
      date_of_birth: date_of_birth || null,
      national_insurance_number: national_insurance_number || null,
      employment_type: employment_type || null,
      employment_start_date: employment_start_date || null,
      employment_end_date: employment_end_date || null,
      hourly_rate: hourly_rate || null,
      location_id: location_id || null,
      status: status || 'active',
    })
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
      created_at,
      location_id,
      locations(id, name)
    `)
    .single()

  if (error) {
    console.error('Error creating staff:', error)
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 })
  }

  return NextResponse.json({ staff }, { status: 201 })
}

