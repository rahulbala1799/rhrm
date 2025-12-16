import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

/**
 * Initialize onboarding session
 * Called when user first hits /onboarding route (no existing sessionId)
 * Generates sessionId and idempotencyKey immediately
 */
export async function POST() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if onboarding already in progress
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_in_progress, onboarding_session_id, onboarding_progress')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // If already in progress, return existing sessionId
  if (profile.onboarding_in_progress && profile.onboarding_session_id) {
    const progress = profile.onboarding_progress as any
    return NextResponse.json({
      sessionId: profile.onboarding_session_id,
      idempotencyKey: progress?.idempotencyKey || null,
    })
  }

  // Generate new session
  const sessionId = randomUUID()
  const idempotencyKey = randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30) // 30 days from now

  // Initialize onboarding progress
  const onboardingProgress = {
    version: 1,
    currentStep: 1,
    completedSteps: [],
    data: {},
    skippedSteps: [],
    idempotencyKey,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  }

  // Update profile with onboarding session
  const { error } = await supabase
    .from('profiles')
    .update({
      onboarding_in_progress: true,
      onboarding_session_id: sessionId,
      onboarding_expires_at: expiresAt.toISOString(),
      onboarding_progress: onboardingProgress,
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error initializing onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to initialize onboarding' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    sessionId,
    idempotencyKey,
  })
}

