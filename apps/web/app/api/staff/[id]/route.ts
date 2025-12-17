import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/staff/[id]
 * Get a specific staff member (admin/manager only)
 * Staff must use /api/me/staff-profile to view their own record
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Staff are forbidden from this endpoint
  if (role === 'staff') {
    return NextResponse.json(
      { error: 'Staff must use /api/me/staff-profile to view their own record' },
      { status: 403 }
    )
  }

  // Only admin, manager, superadmin can access
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

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
      national_insurance_number,
      employment_type,
      job_title,
      department,
      location_id,
      employment_start_date,
      employment_end_date,
      manager_id,
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
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  // Get manager if manager_id exists
  let manager = null
  if (staff.manager_id) {
    const { data: managerData } = await supabase
      .from('staff')
      .select('id, first_name, last_name, employee_number')
      .eq('id', staff.manager_id)
      .eq('tenant_id', tenantId)
      .single()
    manager = managerData
  }

  // Get status history
  const { data: statusHistory } = await supabase
    .from('staff_status_history')
    .select(`
      id,
      old_status,
      new_status,
      effective_date,
      reason,
      changed_by,
      created_at,
      profiles!staff_status_history_changed_by_fkey(id, email, full_name)
    `)
    .eq('staff_id', params.id)
    .eq('tenant_id', tenantId)
    .order('effective_date', { ascending: false })
    .order('created_at', { ascending: false })

  return NextResponse.json({
    staff: {
      ...staff,
      manager,
    },
    statusHistory: statusHistory || []
  })
}

/**
 * PUT /api/staff/[id]
 * Update a staff member (admin/manager only)
 * Staff must use /api/me/staff-profile to update their own record
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Staff are forbidden from this endpoint
  if (role === 'staff') {
    return NextResponse.json(
      { error: 'Staff must use /api/me/staff-profile to update their own record' },
      { status: 403 }
    )
  }

  // Only admin, manager, superadmin can update
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  // Get current staff record to check old status and validate manager reference
  const { data: currentStaff, error: fetchError } = await supabase
    .from('staff')
    .select('id, status, manager_id, tenant_id')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !currentStaff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  const body = await request.json()
  const {
    // Staff-entered fields
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
    // Admin fields
    employee_number,
    first_name,
    last_name,
    national_insurance_number,
    employment_type,
    job_title,
    department,
    location_id,
    employment_start_date,
    employment_end_date,
    manager_id,
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
    // Status change metadata
    status_change_effective_date,
    status_change_reason,
  } = body

  // Validation: Employee number uniqueness
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

  // Validation: Manager self-reference
  if (manager_id === params.id) {
    return NextResponse.json(
      { error: 'Staff cannot be their own manager' },
      { status: 409 }
    )
  }

  // Validation: Manager must be in same tenant
  if (manager_id) {
    const { data: manager } = await supabase
      .from('staff')
      .select('id, tenant_id')
      .eq('id', manager_id)
      .eq('tenant_id', tenantId)
      .single()

    if (!manager) {
      return NextResponse.json(
        { error: 'Manager must be in the same tenant' },
        { status: 409 }
      )
    }
  }

  // Validation: Pay rules
  if (pay_type === 'hourly' && (!hourly_rate || hourly_rate < 0)) {
    return NextResponse.json(
      { error: 'Hourly rate is required and must be >= 0 when pay_type is hourly' },
      { status: 400 }
    )
  }

  if (pay_type === 'salary' && (!salary_amount || salary_amount < 0)) {
    return NextResponse.json(
      { error: 'Salary amount is required and must be >= 0 when pay_type is salary' },
      { status: 400 }
    )
  }

  if (pay_type && !pay_frequency) {
    return NextResponse.json(
      { error: 'Pay frequency is required when pay_type is set' },
      { status: 400 }
    )
  }

  // Validation: Overtime rules
  if (overtime_enabled && !overtime_rule_type) {
    return NextResponse.json(
      { error: 'Overtime rule type is required when overtime is enabled' },
      { status: 400 }
    )
  }

  if (overtime_rule_type === 'multiplier' && (!overtime_multiplier || overtime_multiplier <= 0)) {
    return NextResponse.json(
      { error: 'Overtime multiplier is required and must be > 0 when rule type is multiplier' },
      { status: 400 }
    )
  }

  if (overtime_rule_type === 'flat_extra' && (overtime_flat_extra === undefined || overtime_flat_extra < 0)) {
    return NextResponse.json(
      { error: 'Overtime flat extra is required and must be >= 0 when rule type is flat_extra' },
      { status: 400 }
    )
  }

  // Validation: Min/Max hours
  if (min_hours_per_week !== undefined && max_hours_per_week !== undefined) {
    if (min_hours_per_week > max_hours_per_week) {
      return NextResponse.json(
        { error: 'Minimum hours per week cannot exceed maximum hours per week' },
        { status: 409 }
      )
    }
  }

  // Validation: Date of birth (must be in past)
  if (date_of_birth) {
    const dob = new Date(date_of_birth)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (dob >= today) {
      return NextResponse.json(
        { error: 'Date of birth must be in the past' },
        { status: 400 }
      )
    }
  }

  // Validation: Employment dates
  if (employment_start_date && employment_end_date) {
    const start = new Date(employment_start_date)
    const end = new Date(employment_end_date)
    if (end <= start) {
      return NextResponse.json(
        { error: 'Employment end date must be after start date' },
        { status: 400 }
      )
    }
  }

  // Build update data
  const updateData: any = {}
  
  // Staff-entered fields
  if (preferred_name !== undefined) updateData.preferred_name = preferred_name === '' ? null : preferred_name
  if (email !== undefined) updateData.email = email === '' ? null : email
  if (phone !== undefined) updateData.phone = phone === '' ? null : phone
  if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth === '' ? null : date_of_birth
  if (address_line_1 !== undefined) updateData.address_line_1 = address_line_1 === '' ? null : address_line_1
  if (address_line_2 !== undefined) updateData.address_line_2 = address_line_2 === '' ? null : address_line_2
  if (city !== undefined) updateData.city = city === '' ? null : city
  if (postcode !== undefined) updateData.postcode = postcode === '' ? null : postcode
  if (country !== undefined) updateData.country = country === '' ? null : country
  if (emergency_contact_name !== undefined) updateData.emergency_contact_name = emergency_contact_name === '' ? null : emergency_contact_name
  if (emergency_contact_relationship !== undefined) updateData.emergency_contact_relationship = emergency_contact_relationship === '' ? null : emergency_contact_relationship
  if (emergency_contact_phone !== undefined) updateData.emergency_contact_phone = emergency_contact_phone === '' ? null : emergency_contact_phone
  
  // Admin fields
  if (employee_number !== undefined) updateData.employee_number = employee_number
  if (first_name !== undefined) updateData.first_name = first_name
  if (last_name !== undefined) updateData.last_name = last_name
  if (national_insurance_number !== undefined) updateData.national_insurance_number = national_insurance_number === '' ? null : national_insurance_number
  if (employment_type !== undefined) updateData.employment_type = employment_type === '' ? null : employment_type
  if (job_title !== undefined) updateData.job_title = job_title === '' ? null : job_title
  if (department !== undefined) updateData.department = department === '' ? null : department
  if (location_id !== undefined) updateData.location_id = location_id === '' ? null : location_id
  if (employment_start_date !== undefined) updateData.employment_start_date = employment_start_date === '' ? null : employment_start_date
  if (employment_end_date !== undefined) updateData.employment_end_date = employment_end_date === '' ? null : employment_end_date
  if (manager_id !== undefined) updateData.manager_id = manager_id === '' ? null : manager_id
  if (status !== undefined) updateData.status = status
  if (pay_type !== undefined) updateData.pay_type = pay_type === '' ? null : pay_type
  if (hourly_rate !== undefined) updateData.hourly_rate = hourly_rate === null || hourly_rate === '' ? null : hourly_rate
  if (salary_amount !== undefined) updateData.salary_amount = salary_amount === null || salary_amount === '' ? null : salary_amount
  if (pay_frequency !== undefined) updateData.pay_frequency = pay_frequency === '' ? null : pay_frequency
  if (overtime_enabled !== undefined) updateData.overtime_enabled = overtime_enabled
  if (overtime_rule_type !== undefined) updateData.overtime_rule_type = overtime_rule_type === '' ? null : overtime_rule_type
  if (overtime_multiplier !== undefined) updateData.overtime_multiplier = overtime_multiplier === null || overtime_multiplier === '' ? null : overtime_multiplier
  if (overtime_flat_extra !== undefined) updateData.overtime_flat_extra = overtime_flat_extra === null || overtime_flat_extra === '' ? null : overtime_flat_extra
  if (contracted_weekly_hours !== undefined) updateData.contracted_weekly_hours = contracted_weekly_hours === null || contracted_weekly_hours === '' ? null : contracted_weekly_hours
  if (min_hours_per_week !== undefined) updateData.min_hours_per_week = min_hours_per_week === null || min_hours_per_week === '' ? null : min_hours_per_week
  if (max_hours_per_week !== undefined) updateData.max_hours_per_week = max_hours_per_week === null || max_hours_per_week === '' ? null : max_hours_per_week
  if (max_hours_per_day !== undefined) updateData.max_hours_per_day = max_hours_per_day === null || max_hours_per_day === '' ? null : max_hours_per_day
  if (max_consecutive_days !== undefined) updateData.max_consecutive_days = max_consecutive_days === null || max_consecutive_days === '' ? null : max_consecutive_days
  if (min_rest_hours_between_shifts !== undefined) updateData.min_rest_hours_between_shifts = min_rest_hours_between_shifts === null || min_rest_hours_between_shifts === '' ? null : min_rest_hours_between_shifts
  if (preferred_working_days !== undefined) updateData.preferred_working_days = preferred_working_days === null || (Array.isArray(preferred_working_days) && preferred_working_days.length === 0) ? null : preferred_working_days
  if (preferred_shift_types !== undefined) updateData.preferred_shift_types = preferred_shift_types === null || (Array.isArray(preferred_shift_types) && preferred_shift_types.length === 0) ? null : preferred_shift_types

  // Update staff record
  const { data: staff, error } = await supabase
    .from('staff')
    .update(updateData)
    .eq('id', params.id)
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
      national_insurance_number,
      employment_type,
      job_title,
      department,
      location_id,
      employment_start_date,
      employment_end_date,
      manager_id,
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
    console.error('Error updating staff:', error)
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
  }

  // Get manager if manager_id exists
  let manager = null
  if (staff.manager_id) {
    const { data: managerData } = await supabase
      .from('staff')
      .select('id, first_name, last_name, employee_number')
      .eq('id', staff.manager_id)
      .eq('tenant_id', tenantId)
      .single()
    manager = managerData
  }

  // Create status history entry if status changed
  if (status !== undefined && status !== currentStaff.status) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const effectiveDate = status_change_effective_date || new Date().toISOString().split('T')[0]
      
      const { error: historyError } = await supabase
        .from('staff_status_history')
        .insert({
          tenant_id: tenantId,
          staff_id: params.id,
          old_status: currentStaff.status,
          new_status: status,
          effective_date: effectiveDate,
          reason: status_change_reason || null,
          changed_by: user.id,
        })

      if (historyError) {
        console.error('Error creating status history:', historyError)
        // Don't fail the update, just log the error
      }
    }
  }

  return NextResponse.json({
    staff: {
      ...staff,
      manager,
    },
  })
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


