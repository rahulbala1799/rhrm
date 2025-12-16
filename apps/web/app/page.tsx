import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTenantContext } from '@/lib/auth/get-tenant-context'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Source of Truth: Active membership check (single source of truth)
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    // Check for onboarding progress (only own profile, self-only query)
    // NOTE: Only select onboarding_progress for own profile (WHERE id = auth.uid())
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_progress, onboarding_in_progress, onboarding_expires_at')
      .eq('id', user.id) // CRITICAL: Self-only query
      .single()

    // Check expiration (server-side check, cleanup happens in API/worker)
    if (profile?.onboarding_expires_at) {
      const expiresAt = new Date(profile.onboarding_expires_at)
      if (expiresAt < new Date()) {
        // Expired - offer restart
        redirect('/onboarding/expired')
      }
    }

    if (profile?.onboarding_in_progress && profile?.onboarding_progress) {
      // Resume onboarding at saved step
      const progress = profile.onboarding_progress as any
      if (progress?.currentStep) {
        redirect(`/onboarding/step-${progress.currentStep}`)
      } else {
        redirect('/onboarding/step-1-welcome')
      }
    } else {
      // Check for invited-only memberships (still allow onboarding but warn)
      const { data: invitedMemberships } = await supabase
        .from('memberships')
        .select('tenant_id, status, tenants(name)')
        .eq('user_id', user.id)
        .eq('status', 'invited')

      if (invitedMemberships && invitedMemberships.length > 0) {
        // Show warning but allow onboarding
        redirect('/onboarding?warnInvite=true')
      } else {
        // Start fresh onboarding
        redirect('/onboarding')
      }
    }
  }

  // User has tenant - redirect to dashboard
  redirect('/dashboard')
}

