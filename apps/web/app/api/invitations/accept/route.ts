import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Accept Invitation (Server-Side Only)
 * 
 * Creates active membership when invitation is accepted.
 * This is the ONLY way active memberships are created (invite-only onboarding).
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { token } = await request.json()

  if (!token) {
    return NextResponse.json(
      { error: 'token required' },
      { status: 400 }
    )
  }

  // Use service role for invitation validation and membership creation
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

  // Validate invitation
  const { data: invitation, error: inviteError } = await serviceClient
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (inviteError || !invitation) {
    return NextResponse.json(
      { error: 'Invalid or expired invitation' },
      { status: 404 }
    )
  }

  // Check expiry
  if (new Date(invitation.expires_at) < new Date()) {
    await serviceClient
      .from('invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id)

    return NextResponse.json(
      { error: 'Invitation has expired' },
      { status: 400 }
    )
  }

  // Verify email matches (if user is already signed up)
  if (invitation.email !== user.email) {
    return NextResponse.json(
      { error: 'Invitation email does not match your account' },
      { status: 403 }
    )
  }

  // Check if membership already exists
  const { data: existingMembership } = await serviceClient
    .from('memberships')
    .select('id')
    .eq('tenant_id', invitation.tenant_id)
    .eq('user_id', user.id)
    .single()

  if (existingMembership) {
    // Update invitation status
    await serviceClient
      .from('invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    // Ensure staff record exists if role is 'staff' (in case it wasn't created before)
    if (invitation.role === 'staff') {
      const { data: existingStaff } = await serviceClient
        .from('staff')
        .select('id')
        .eq('tenant_id', invitation.tenant_id)
        .eq('user_id', user.id)
        .single()

      if (!existingStaff) {
        // Create staff record if it doesn't exist
        const { data: profile } = await serviceClient
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', user.id)
          .single()

        const fullName = profile?.full_name || user.email || 'Staff Member'
        const nameParts = fullName.trim().split(/\s+/)
        const first_name = nameParts[0] || 'Staff'
        const last_name = nameParts.slice(1).join(' ') || 'Member'

        const timestamp = Date.now().toString().slice(-6)
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        const employee_number = `EMP${timestamp}${random}`

        await serviceClient
          .from('staff')
          .insert({
            tenant_id: invitation.tenant_id,
            user_id: user.id,
            employee_number,
            first_name,
            last_name,
            email: profile?.email || user.email || null,
            phone: profile?.phone || null,
            status: 'active',
          })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'You already have access to this tenant',
      membershipId: existingMembership.id,
    })
  }

  // Create active membership (server-side only)
  const { data: membership, error: membershipError } = await serviceClient
    .from('memberships')
    .insert({
      tenant_id: invitation.tenant_id,
      user_id: user.id,
      role: invitation.role,
      status: 'active',
      invited_by: invitation.invited_by,
      joined_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (membershipError) {
    console.error('Error creating membership:', membershipError)
    return NextResponse.json(
      { error: 'Failed to create membership' },
      { status: 500 }
    )
  }

  // Update invitation status
  await serviceClient
    .from('invitations')
    .update({ 
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitation.id)

  // Create staff record immediately if role is 'staff'
  // This ensures staff appear in the list as soon as they accept the invitation
  if (invitation.role === 'staff') {
    // Check if staff record already exists
    const { data: existingStaff } = await serviceClient
      .from('staff')
      .select('id')
      .eq('tenant_id', invitation.tenant_id)
      .eq('user_id', user.id)
      .single()

    if (!existingStaff) {
      // Get user profile for name and email
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .single()

      // Parse full_name into first_name and last_name
      const fullName = profile?.full_name || user.email || 'Staff Member'
      const nameParts = fullName.trim().split(/\s+/)
      const first_name = nameParts[0] || 'Staff'
      const last_name = nameParts.slice(1).join(' ') || 'Member'

      // Generate employee number (format: EMP + timestamp + random)
      const timestamp = Date.now().toString().slice(-6)
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const employee_number = `EMP${timestamp}${random}`

      // Create staff record
      const { data: staff, error: staffError } = await serviceClient
        .from('staff')
        .insert({
          tenant_id: invitation.tenant_id,
          user_id: user.id,
          employee_number,
          first_name,
          last_name,
          email: profile?.email || user.email || null,
          phone: profile?.phone || null,
          status: 'active',
        })
        .select('id, employee_number')
        .single()

      if (staffError) {
        console.error('Error creating staff record:', staffError)
        console.error('Staff error details:', JSON.stringify({
          code: staffError.code,
          message: staffError.message,
          details: staffError.details,
          hint: staffError.hint,
          tenant_id: invitation.tenant_id,
          user_id: user.id,
          email: profile?.email || user.email,
        }, null, 2))
        
        // If employee number conflict, try again with different number
        if (staffError.code === '23505') {
          const retryTimestamp = Date.now().toString().slice(-6)
          const retryRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
          const retryEmployeeNumber = `EMP${retryTimestamp}${retryRandom}`

          const { data: retryStaff, error: retryError } = await serviceClient
            .from('staff')
            .insert({
              tenant_id: invitation.tenant_id,
              user_id: user.id,
              employee_number: retryEmployeeNumber,
              first_name,
              last_name,
              email: profile?.email || user.email || null,
              phone: profile?.phone || null,
              status: 'active',
            })
            .select('id, employee_number')
            .single()

          if (retryError) {
            console.error('Error creating staff record (retry):', retryError)
            console.error('Retry error details:', JSON.stringify({
              code: retryError.code,
              message: retryError.message,
              details: retryError.details,
              hint: retryError.hint,
            }, null, 2))
            // Don't fail the invitation acceptance if staff record creation fails
            // Staff can complete onboarding later to create the record
            // Or admin can use /api/staff/fix-missing-records to create it
          } else {
            console.log('Successfully created staff record on retry:', retryStaff)
          }
        } else {
          // Don't fail the invitation acceptance if staff record creation fails
          // Staff can complete onboarding later to create the record
          // Or admin can use /api/staff/fix-missing-records to create it
        }
      } else {
        console.log('Successfully created staff record:', staff)
      }
    }
  }

  // Log to audit
  await serviceClient.from('audit_logs').insert({
    tenant_id: invitation.tenant_id,
    user_id: user.id,
    action: 'create',
    resource_type: 'membership',
    resource_id: membership.id,
    changes: {
      created_via: 'invitation',
      invitation_id: invitation.id,
      role: invitation.role,
    },
  })

  return NextResponse.json({
    success: true,
    membership,
    tenantId: invitation.tenant_id,
  })
}

