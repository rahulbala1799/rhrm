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

  // User has tenant - show dashboard/home
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">HR and Staff Management</h1>
        <div className="bg-white/10 p-6 rounded-lg">
          <p className="mb-4">Welcome, {user.email}!</p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

