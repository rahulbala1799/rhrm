import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/me/staff-profile
 * Get current user's staff profile (staff self-service)
 */
export async function GET() {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get staff record linked to user
  const { data: staff, error } = await supabase
    .from('staff')
    .select(`
      id,
      tenant_id,
      user_id,
      employee_number,
      first_name,
      last_name,
      preferred_name,
      email,
      phone,
      date_of_birth,
      address_line_1,
      address_line_2,
      city,
      postcode,
      country,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_phone,
      employment_type,
      job_title,
      department,
      location_id,
      employment_start_date,
      employment_end_date,
      status,
      pay_type,
      hourly_rate,
      salary_amount,
      pay_frequency,
      overtime_enabled,
      overtime_rule_type,
      overtime_multiplier,
      overtime_flat_extra,
      contracted_weekly_hours,
      min_hours_per_week,
      max_hours_per_week,
      max_hours_per_day,
      max_consecutive_days,
      min_rest_hours_between_shifts,
      preferred_working_days,
      preferred_shift_types,
      created_at,
      updated_at,
      locations(id, name, address, postcode)
    `)
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !staff) {
    return NextResponse.json(
      { error: 'Staff record not found for this user' },
      { status: 404 }
    )
  }

  // Exclude national_insurance_number (sensitive field)
  // It's already excluded from the select, but being explicit

  return NextResponse.json({ staff })
}

/**
 * PUT /api/me/staff-profile
 * Update current user's staff profile (staff self-service, only staff-entered fields)
 */
export async function PUT(request: Request) {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Field whitelist: only staff-entered fields are allowed
  const allowedFields = [
    'preferred_name',
    'email',
    'phone',
    'date_of_birth',
    'address_line_1',
    'address_line_2',
    'city',
    'postcode',
    'country',
    'emergency_contact_name',
    'emergency_contact_relationship',
    'emergency_contact_phone',
  ]

  // Check for forbidden fields
  const forbiddenFields = Object.keys(body).filter(
    (key) => !allowedFields.includes(key)
  )

  if (forbiddenFields.length > 0) {
    return NextResponse.json(
      {
        error: 'Staff can only update their own profile fields',
        forbiddenFields,
      },
      { status: 403 }
    )
  }

  // Validation: Date of birth must be in past
  if (body.date_of_birth) {
    const dob = new Date(body.date_of_birth)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (dob >= today) {
      return NextResponse.json(
        { error: 'Date of birth must be in the past' },
        { status: 400 }
      )
    }
  }

  // Validation: Email format (basic check)
  if (body.email && body.email !== '' && !body.email.includes('@')) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    )
  }

  // Get staff record to verify it exists and belongs to user
  const { data: currentStaff } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!currentStaff) {
    return NextResponse.json(
      { error: 'Staff record not found for this user' },
      { status: 404 }
    )
  }

  // Build update data (convert empty strings to null)
  const updateData: any = {}
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field] === '' ? null : body[field]
    }
  }

  // Update staff record
  const { data: staff, error } = await supabase
    .from('staff')
    .update(updateData)
    .eq('id', currentStaff.id)
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .select(`
      id,
      tenant_id,
      user_id,
      employee_number,
      first_name,
      last_name,
      preferred_name,
      email,
      phone,
      date_of_birth,
      address_line_1,
      address_line_2,
      city,
      postcode,
      country,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_phone,
      employment_type,
      job_title,
      department,
      location_id,
      employment_start_date,
      employment_end_date,
      status,
      pay_type,
      hourly_rate,
      salary_amount,
      pay_frequency,
      overtime_enabled,
      overtime_rule_type,
      overtime_multiplier,
      overtime_flat_extra,
      contracted_weekly_hours,
      min_hours_per_week,
      max_hours_per_week,
      max_hours_per_day,
      max_consecutive_days,
      min_rest_hours_between_shifts,
      preferred_working_days,
      preferred_shift_types,
      created_at,
      updated_at,
      locations(id, name, address, postcode)
    `)
    .single()

  if (error) {
    console.error('Error updating staff profile:', error)
    return NextResponse.json(
      { error: 'Failed to update staff profile' },
      { status: 500 }
    )
  }

  return NextResponse.json({ staff })
}


