import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'

export default async function OnboardingPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user already has a tenant
  const { tenantId } = await getTenantContext()
  if (tenantId) {
    redirect('/')
  }

  // Check for onboarding progress (only own profile, self-only query)
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_progress, onboarding_in_progress, onboarding_expires_at, onboarding_session_id')
    .eq('id', user.id) // CRITICAL: Self-only query
    .single()

  // Check expiration
  if (profile?.onboarding_expires_at) {
    const expiresAt = new Date(profile.onboarding_expires_at)
    if (expiresAt < new Date()) {
      redirect('/onboarding/expired')
    }
  }

  // If onboarding in progress, redirect to current step
  if (profile?.onboarding_in_progress && profile?.onboarding_progress) {
    const progress = profile.onboarding_progress as any
    if (progress?.currentStep) {
      redirect(`/onboarding/step-${progress.currentStep}`)
    }
  }

  // If no session ID, user needs to initialize
  if (!profile?.onboarding_session_id) {
    // This will be handled client-side in the step pages
    redirect('/onboarding/step-1-welcome')
  }

  // Default to step 1
  redirect('/onboarding/step-1-welcome')
}




