import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteAcceptancePage from './invite-acceptance-page'

interface PageProps {
  params: { token: string }
}

export default async function InvitePage({ params }: PageProps) {
  const supabase = await createClient()

  console.log('[INVITE PAGE] Loading invitation for token:', params.token)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('[INVITE PAGE] User logged in:', !!user)

  // If user is logged in and has tenant, check if they need staff onboarding
  if (user) {
    const { data: memberships } = await supabase
      .from('memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)

    if (memberships && memberships.length > 0) {
      // Check if staff onboarding is completed
      const { data: profile } = await supabase
        .from('profiles')
        .select('staff_onboarding_completed')
        .eq('id', user.id)
        .single()

      if (profile?.staff_onboarding_completed) {
        redirect('/dashboard')
      } else {
        // Has active membership but needs onboarding
        redirect('/staff-onboarding/welcome')
      }
    }
  }

  // Fetch invitation details (public info only)
  console.log('[INVITE PAGE] Querying invitation...')
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, email, role, status, expires_at, tenants!inner(name, slug)')
    .eq('token', params.token)
    .single()

  console.log('[INVITE PAGE] Query result:', { 
    found: !!invitation, 
    error: error?.message, 
    errorCode: error?.code,
    errorDetails: error?.details,
    errorHint: error?.hint
  })

  if (error || !invitation) {
    console.error('[INVITE PAGE] Invitation not found or error:', error)
    redirect('/invite/invalid')
  }

  console.log('[INVITE PAGE] Invitation found:', { 
    id: invitation.id, 
    email: invitation.email, 
    status: invitation.status,
    expires_at: invitation.expires_at
  })

  if (invitation.status !== 'pending') {
    console.log('[INVITE PAGE] Invitation not pending, redirecting to expired')
    redirect(`/invite/${params.token}/expired`)
  }

  if (new Date(invitation.expires_at) < new Date()) {
    console.log('[INVITE PAGE] Invitation expired')
    redirect(`/invite/${params.token}/expired`)
  }

  return <InviteAcceptancePage invitation={invitation} token={params.token} />
}

