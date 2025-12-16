import { createClient } from '@/lib/supabase/server'
import { verifyTenantAccess } from '@/lib/auth/get-tenant-context'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Send invitation to join tenant
 * Requires admin role - validated server-side
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, role, tenantId } = await request.json()

  if (!email || !role || !tenantId) {
    return NextResponse.json(
      { error: 'email, role, and tenantId required' },
      { status: 400 }
    )
  }

  // CRITICAL: Validate tenantId against memberships (never trust client state alone)
  // Verify user has active membership in this tenant
  // Verify user has required role (admin) in this tenant
  const hasAccess = await verifyTenantAccess(tenantId, 'admin')
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Admin role required' },
      { status: 403 }
    )
  }

  if (!['admin', 'manager', 'staff'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Generate secure token
  const token = crypto.randomUUID()

  // Create invitation (RLS will enforce tenant_id, but we've already validated)
  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      tenant_id: tenantId,
      email,
      role,
      invited_by: user.id,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get inviter and tenant info for email
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .single()

  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`

  // Send invitation email
  const { sendInvitationEmail } = await import('@/lib/email/send-invitation')
  const emailResult = await sendInvitationEmail({
    to: email,
    invitationUrl,
    inviterName: inviterProfile?.full_name || 'A team member',
    companyName: tenant?.name || 'the organization',
    role: role.charAt(0).toUpperCase() + role.slice(1),
  })

  if (!emailResult.success) {
    // Log error but don't fail the invitation creation
    // The invitation is still created and the URL is returned
    console.error('Failed to send invitation email:', emailResult.error)
  }

  return NextResponse.json({
    success: true,
    invitation,
    invitationUrl, // Still return for debugging/admin use
    emailSent: emailResult.success,
    emailError: emailResult.error,
  })
}

