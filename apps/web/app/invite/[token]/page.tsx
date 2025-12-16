import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteAcceptancePage from './invite-acceptance-page'

interface PageProps {
  params: { token: string }
}

export default async function InvitePage({ params }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, email, role, status, expires_at, tenants!inner(name, slug)')
    .eq('token', params.token)
    .single()

  if (error || !invitation) {
    redirect('/invite/invalid')
  }

  if (invitation.status !== 'pending') {
    redirect(`/invite/${params.token}/expired`)
  }

  if (new Date(invitation.expires_at) < new Date()) {
    redirect(`/invite/${params.token}/expired`)
  }

  return <InviteAcceptancePage invitation={invitation} token={params.token} />
}

