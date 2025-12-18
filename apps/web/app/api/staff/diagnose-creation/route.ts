import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * POST /api/staff/diagnose-creation
 * Diagnoses why staff record creation is failing
 * Tests the exact same logic as invitation acceptance
 */
export async function POST(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can access this
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { user_id, email } = body

  if (!user_id || !email) {
    return NextResponse.json({ error: 'user_id and email required' }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const diagnostics: any = {
    step: 'starting',
    errors: [],
    warnings: [],
    success: false,
  }

  try {
    // Step 1: Check if staff record already exists
    diagnostics.step = 'checking_existing_staff'
    const { data: existingStaff, error: checkError } = await serviceClient
      .from('staff')
      .select('id, employee_number, first_name, last_name')
      .eq('tenant_id', tenantId)
      .eq('user_id', user_id)
      .maybeSingle()

    if (checkError) {
      diagnostics.errors.push({
        step: 'check_existing',
        error: checkError.message,
        code: checkError.code,
        details: checkError.details,
      })
    }

    if (existingStaff) {
      return NextResponse.json({
        success: false,
        message: 'Staff record already exists',
        existing_staff: existingStaff,
        diagnostics,
      })
    }

    // Step 2: Get user profile
    diagnostics.step = 'fetching_profile'
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', user_id)
      .single()

    if (profileError) {
      diagnostics.errors.push({
        step: 'fetch_profile',
        error: profileError.message,
        code: profileError.code,
        details: profileError.details,
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch profile',
        diagnostics,
      })
    }

    diagnostics.profile = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone: profile.phone,
    }

    // Step 3: Check membership
    diagnostics.step = 'checking_membership'
    const { data: membership, error: membershipError } = await serviceClient
      .from('memberships')
      .select('id, user_id, tenant_id, role, status')
      .eq('tenant_id', tenantId)
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single()

    if (membershipError) {
      diagnostics.errors.push({
        step: 'check_membership',
        error: membershipError.message,
        code: membershipError.code,
        details: membershipError.details,
      })
      diagnostics.warnings.push('No active membership found - staff record creation may fail RLS checks')
    } else {
      diagnostics.membership = membership
    }

    // Step 4: Parse name
    diagnostics.step = 'parsing_name'
    const fullName = profile.full_name || profile.email || 'Staff Member'
    const nameParts = fullName.trim().split(/\s+/)
    const first_name = nameParts[0] || 'Staff'
    const last_name = nameParts.slice(1).join(' ') || 'Member'

    diagnostics.parsed_name = {
      full_name: fullName,
      first_name,
      last_name,
    }

    // Step 5: Generate employee number
    diagnostics.step = 'generating_employee_number'
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const employee_number = `EMP${timestamp}${random}`

    diagnostics.employee_number = employee_number

    // Step 6: Prepare insert data
    diagnostics.step = 'preparing_insert_data'
    const insertData = {
      tenant_id: tenantId,
      user_id: user_id,
      employee_number,
      first_name,
      last_name,
      email: profile.email || null,
      phone: profile.phone || null,
      status: 'active',
    }

    diagnostics.insert_data = insertData

    // Step 7: Validate required fields
    diagnostics.step = 'validating_required_fields'
    const requiredFields = ['tenant_id', 'employee_number', 'first_name', 'last_name', 'status']
    const missingFields = requiredFields.filter(field => !insertData[field as keyof typeof insertData])
    
    if (missingFields.length > 0) {
      diagnostics.errors.push({
        step: 'validation',
        error: `Missing required fields: ${missingFields.join(', ')}`,
        missing_fields: missingFields,
      })
      return NextResponse.json({
        success: false,
        message: 'Missing required fields',
        diagnostics,
      })
    }

    // Step 8: Attempt insert
    diagnostics.step = 'attempting_insert'
    const { data: staff, error: staffError } = await serviceClient
      .from('staff')
      .insert(insertData)
      .select('id, employee_number, first_name, last_name, status')
      .single()

    if (staffError) {
      diagnostics.errors.push({
        step: 'insert',
        error: staffError.message,
        code: staffError.code,
        details: staffError.details,
        hint: staffError.hint,
        full_error: staffError,
      })

      // If employee number conflict, try retry
      if (staffError.code === '23505') {
        diagnostics.step = 'retrying_with_new_employee_number'
        const retryTimestamp = Date.now().toString().slice(-6)
        const retryRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        const retryEmployeeNumber = `EMP${retryTimestamp}${retryRandom}`

        const retryData = {
          ...insertData,
          employee_number: retryEmployeeNumber,
        }

        const { data: retryStaff, error: retryError } = await serviceClient
          .from('staff')
          .insert(retryData)
          .select('id, employee_number, first_name, last_name, status')
          .single()

        if (retryError) {
          diagnostics.errors.push({
            step: 'retry_insert',
            error: retryError.message,
            code: retryError.code,
            details: retryError.details,
            hint: retryError.hint,
            full_error: retryError,
          })
          return NextResponse.json({
            success: false,
            message: 'Failed to create staff record (even after retry)',
            diagnostics,
          })
        } else {
          diagnostics.success = true
          diagnostics.created_staff = retryStaff
          return NextResponse.json({
            success: true,
            message: 'Staff record created successfully (after retry)',
            staff: retryStaff,
            diagnostics,
          })
        }
      } else {
        return NextResponse.json({
          success: false,
          message: 'Failed to create staff record',
          diagnostics,
        })
      }
    } else {
      diagnostics.success = true
      diagnostics.created_staff = staff
      return NextResponse.json({
        success: true,
        message: 'Staff record created successfully',
        staff,
        diagnostics,
      })
    }
  } catch (error: any) {
    diagnostics.errors.push({
      step: 'unexpected_error',
      error: error.message,
      stack: error.stack,
    })
    return NextResponse.json({
      success: false,
      message: 'Unexpected error during diagnosis',
      diagnostics,
    }, { status: 500 })
  }
}

