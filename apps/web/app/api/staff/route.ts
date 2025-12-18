import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/staff
 * Get all staff members for the tenant
 */
export async function GET(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  // Check if user can view budget (admin/manager only)
  const canViewBudget = role === 'admin' || role === 'manager' || role === 'superadmin'
  
  // Check if this is for manager dropdown
  const forManagerDropdown = searchParams.get('for_manager_dropdown') === 'true'
  
  // If for manager dropdown, return minimal fields
  if (forManagerDropdown) {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('id, employee_number, first_name, last_name, job_title')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('first_name', { ascending: true })
    
    if (error) {
      console.error('Error fetching staff for manager dropdown:', error)
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
    }
    
    return NextResponse.json({ staff: staff || [] })
  }
  
  // Validate and sanitize search
  const search = searchParams.get('search')?.trim() || null
  
  // Validate and sanitize status (must be valid enum)
  const statusParam = searchParams.get('status')
  const validStatuses = ['active', 'on_leave', 'terminated']
  const status = statusParam && validStatuses.includes(statusParam) ? statusParam : null
  
  // Validate and sanitize location_id (must be valid UUID format)
  const locationIdParam = searchParams.get('location_id')
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const locationId = locationIdParam && uuidRegex.test(locationIdParam) ? locationIdParam : null
  
  // Validate and sanitize pagination params
  const pageParam = searchParams.get('page')
  const pageSizeParam = searchParams.get('pageSize')
  
  // Parse page with validation (must be positive integer, default 1)
  let page: number | null = null
  if (pageParam) {
    const parsed = parseInt(pageParam, 10)
    page = !isNaN(parsed) && parsed > 0 ? parsed : 1
  }
  
  // Parse pageSize with validation (must be positive integer, max 100, default 25)
  let pageSize: number | null = null
  if (pageSizeParam) {
    const parsed = parseInt(pageSizeParam, 10)
    if (!isNaN(parsed) && parsed > 0) {
      pageSize = Math.min(parsed, 100) // Cap at 100 for performance
    } else {
      pageSize = 25
    }
  }

  // Build base query for counting
  let countQuery = supabase
    .from('staff')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  // Build main query - always select hourly_rate, but remove it from response if user doesn't have permission
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

  // Apply filters to both queries
  if (search) {
    const searchFilter = `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,employee_number.ilike.%${search}%`
    query = query.or(searchFilter)
    countQuery = countQuery.or(searchFilter)
  }

  if (status) {
    query = query.eq('status', status)
    countQuery = countQuery.eq('status', status)
  }

  if (locationId) {
    query = query.eq('location_id', locationId)
    countQuery = countQuery.eq('location_id', locationId)
  }

  // Get total count if pagination is requested
  let total = null
  if (page !== null && pageSize !== null) {
    const { count, error: countError } = await countQuery
    if (countError) {
      console.error('Error counting staff:', countError)
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
    }
    total = count || 0

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)
  }

  const { data: staff, error } = await query

  if (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }

  // Remove hourly_rate from response if user doesn't have permission
  const sanitizedStaff = staff?.map((s: any) => {
    if (!canViewBudget && 'hourly_rate' in s) {
      const { hourly_rate, ...rest } = s
      return rest
    }
    return s
  }) || []

  // Return with pagination metadata if pagination was requested
  if (page !== null && pageSize !== null && total !== null) {
    return NextResponse.json({
      staff: sanitizedStaff,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  }

  // Backward compatibility: return array if no pagination
  return NextResponse.json({ staff: sanitizedStaff })
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


