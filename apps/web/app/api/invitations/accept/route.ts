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
    // Update invitation status and return success
    await serviceClient
      .from('invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

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

