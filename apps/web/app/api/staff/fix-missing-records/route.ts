import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * GET /api/staff/fix-missing-records
 * Returns information about missing staff records
 */
export async function GET() {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can access this
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    message: 'This endpoint fixes missing staff records. Use POST method to execute the fix.',
    usage: 'POST /api/staff/fix-missing-records',
    description: 'Creates missing staff records for accepted invitations that don\'t have staff records',
  })
}

/**
 * POST /api/staff/fix-missing-records
 * Creates missing staff records for accepted invitations that don't have staff records
 * Only accessible to admins/managers for troubleshooting
 */
export async function POST() {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can access this
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
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

  // Get all accepted invitations with role 'staff' for this tenant
  const { data: acceptedInvitations, error: inviteError } = await serviceClient
    .from('invitations')
    .select('id, email, role, tenant_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'accepted')
    .eq('role', 'staff')

  if (inviteError) {
    console.error('Error fetching invitations:', inviteError)
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
  }

  const results = []
  let created = 0
  let skipped = 0
  let errors = 0

  for (const invitation of acceptedInvitations || []) {
    // Get profile for this invitation email
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('id, email, full_name, phone')
      .eq('email', invitation.email)
      .single()

    if (!profile) {
      results.push({
        invitation_id: invitation.id,
        email: invitation.email,
        status: 'skipped',
        reason: 'No profile found for this email',
      })
      skipped++
      continue
    }

    // Get membership for this user
    const { data: membership } = await serviceClient
      .from('memberships')
      .select('id, user_id')
      .eq('tenant_id', tenantId)
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      results.push({
        invitation_id: invitation.id,
        email: invitation.email,
        status: 'skipped',
        reason: 'No active membership found',
      })
      skipped++
      continue
    }

    // Check if staff record already exists
    const { data: existingStaff } = await serviceClient
      .from('staff')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', membership.user_id)
      .single()

    if (existingStaff) {
      results.push({
        invitation_id: invitation.id,
        email: invitation.email,
        status: 'skipped',
        reason: 'Staff record already exists',
        staff_id: existingStaff.id,
      })
      skipped++
      continue
    }

    // Create staff record
    const fullName = profile.full_name || profile.email || 'Staff Member'
    const nameParts = fullName.trim().split(/\s+/)
    const first_name = nameParts[0] || 'Staff'
    const last_name = nameParts.slice(1).join(' ') || 'Member'

    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const employee_number = `EMP${timestamp}${random}`

    const { data: staff, error: staffError } = await serviceClient
      .from('staff')
      .insert({
        tenant_id: tenantId,
        user_id: membership.user_id,
        employee_number,
        first_name,
        last_name,
        email: profile.email || null,
        phone: profile.phone || null,
        status: 'active',
      })
      .select('id, employee_number')
      .single()

    if (staffError) {
      // If employee number conflict, try again with different number
      if (staffError.code === '23505') {
        const retryTimestamp = Date.now().toString().slice(-6)
        const retryRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        const retryEmployeeNumber = `EMP${retryTimestamp}${retryRandom}`

        const { data: retryStaff, error: retryError } = await serviceClient
          .from('staff')
          .insert({
            tenant_id: tenantId,
            user_id: membership.user_id,
            employee_number: retryEmployeeNumber,
            first_name,
            last_name,
            email: profile.email || null,
            phone: profile.phone || null,
            status: 'active',
          })
          .select('id, employee_number')
          .single()

        if (retryError) {
          results.push({
            invitation_id: invitation.id,
            email: invitation.email,
            status: 'error',
            reason: retryError.message,
            error_code: retryError.code,
          })
          errors++
        } else {
          results.push({
            invitation_id: invitation.id,
            email: invitation.email,
            status: 'created',
            staff_id: retryStaff.id,
            employee_number: retryStaff.employee_number,
          })
          created++
        }
      } else {
        results.push({
          invitation_id: invitation.id,
          email: invitation.email,
          status: 'error',
          reason: staffError.message,
          error_code: staffError.code,
        })
        errors++
      }
    } else {
      results.push({
        invitation_id: invitation.id,
        email: invitation.email,
        status: 'created',
        staff_id: staff.id,
        employee_number: staff.employee_number,
      })
      created++
    }
  }

  return NextResponse.json({
    success: true,
    summary: {
      total_invitations: acceptedInvitations?.length || 0,
      created,
      skipped,
      errors,
    },
    results,
    message: created > 0 
      ? `Successfully created ${created} staff record(s). They should now appear in the staff list.`
      : 'No staff records were created. Check the results for details.',
  })
}

