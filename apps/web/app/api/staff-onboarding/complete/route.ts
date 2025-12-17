import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/staff-onboarding/complete
 * Mark staff onboarding as complete
 */
export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Update profile to mark staff onboarding as complete
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

  return NextResponse.json({ success: true })
}


