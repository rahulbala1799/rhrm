import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * POST /api/staff-onboarding/complete
 * Mark staff onboarding as complete AND automatically create staff record
 */
export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get tenant context
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json({ error: 'No active tenant found' }, { status: 400 })
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Error fetching profile:', profileError)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  // Check if staff record already exists
  const { data: existingStaff } = await supabase
    .from('staff')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single()

  if (existingStaff) {
    // Staff record already exists, just mark onboarding as complete
    const { error } = await supabase
      .from('profiles')
      .update({
        staff_onboarding_completed: true,
        staff_onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      console.error('Error completing staff onboarding:', error)
      return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
    }

    return NextResponse.json({ success: true, staffRecordExists: true })
  }

  // Parse full_name into first_name and last_name
  const fullName = profile.full_name || profile.email || 'Staff Member'
  const nameParts = fullName.trim().split(/\s+/)
  const first_name = nameParts[0] || 'Staff'
  const last_name = nameParts.slice(1).join(' ') || 'Member'

  // Generate employee number (format: EMP + timestamp + random)
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const employee_number = `EMP${timestamp}${random}`

  // Create staff record automatically
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .insert({
      tenant_id: tenantId,
      user_id: user.id,
      employee_number,
      first_name,
      last_name,
      email: profile.email || user.email || null,
      phone: profile.phone || null,
      status: 'active',
    })
    .select('id, employee_number')
    .single()

  if (staffError) {
    console.error('Error creating staff record:', staffError)
    console.error('Staff error details:', JSON.stringify(staffError, null, 2))
    // If employee number conflict, try again with different number
    if (staffError.code === '23505') { // Unique violation
      const retryTimestamp = Date.now().toString().slice(-6)
      const retryRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      const retryEmployeeNumber = `EMP${retryTimestamp}${retryRandom}`

      const { data: retryStaff, error: retryError } = await supabase
        .from('staff')
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          employee_number: retryEmployeeNumber,
          first_name,
          last_name,
          email: profile.email || user.email || null,
          phone: profile.phone || null,
          status: 'active',
        })
        .select('id, employee_number')
        .single()

      if (retryError) {
        console.error('Error creating staff record (retry):', retryError)
        console.error('Retry error details:', JSON.stringify(retryError, null, 2))
        return NextResponse.json({ 
          error: 'Failed to create staff record', 
          details: retryError.message,
          code: retryError.code 
        }, { status: 500 })
      }

      // Mark onboarding as complete
      const { error } = await supabase
        .from('profiles')
        .update({
          staff_onboarding_completed: true,
          staff_onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error completing staff onboarding:', error)
        return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        staff: retryStaff,
        employee_number: retryEmployeeNumber 
      })
    }

    return NextResponse.json({ 
      error: 'Failed to create staff record', 
      details: staffError.message,
      code: staffError.code,
      hint: staffError.code === '23505' ? 'Employee number conflict - this should have been retried' : 'Unknown error'
    }, { status: 500 })
  }

  // Mark onboarding as complete
  const { error } = await supabase
    .from('profiles')
    .update({
      staff_onboarding_completed: true,
      staff_onboarding_completed_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error completing staff onboarding:', error)
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    staff,
    employee_number: staff.employee_number 
  })
}



