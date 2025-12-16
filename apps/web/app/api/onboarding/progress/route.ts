import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const CURRENT_SCHEMA_VERSION = 1

/**
 * Onboarding Progress API
 * All endpoints are SELF-ONLY - can only read/write auth.uid() profile
 * No tenantId or userId parameters allowed
 */

/**
 * GET: Retrieve current onboarding progress
 */
export async function GET() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Self-only query: only read own profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('onboarding_progress, onboarding_in_progress, onboarding_expires_at')
    .eq('id', user.id) // CRITICAL: Self-only
    .single()

  if (error) {
    console.error('Error fetching onboarding progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    )
  }

  if (!profile) {
    return NextResponse.json({ progress: null, inProgress: false })
  }

  // Check expiration
  if (profile.onboarding_expires_at) {
    const expiresAt = new Date(profile.onboarding_expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json({ 
        progress: null, 
        inProgress: false,
        expired: true 
      })
    }
  }

  const progress = profile.onboarding_progress as any

  // Check schema version
  if (progress && progress.version !== CURRENT_SCHEMA_VERSION) {
    return NextResponse.json({
      progress,
      inProgress: profile.onboarding_in_progress,
      versionMismatch: true,
    })
  }

  return NextResponse.json({
    progress,
    inProgress: profile.onboarding_in_progress,
  })
}

/**
 * PUT: Save onboarding progress
 */
export async function PUT(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { currentStep, data, sessionId, skippedSteps } = body

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 }
    )
  }

  // Get current profile state
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('onboarding_session_id, onboarding_progress')
    .eq('id', user.id) // CRITICAL: Self-only
    .single()

  if (fetchError || !profile) {
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }

  // Concurrency check: sessionId must match
  if (profile.onboarding_session_id && profile.onboarding_session_id !== sessionId) {
    return NextResponse.json(
      { 
        error: 'Session ID mismatch. Another tab/device is active. Please close it or restart onboarding.',
        conflict: true 
      },
      { status: 409 }
    )
  }

  // Get existing progress or initialize
  const existingProgress = (profile.onboarding_progress as any) || {}
  
  // Update progress
  const updatedProgress = {
    version: CURRENT_SCHEMA_VERSION,
    currentStep: currentStep || existingProgress.currentStep || 1,
    completedSteps: existingProgress.completedSteps || [],
    data: {
      ...existingProgress.data,
      ...data,
    },
    skippedSteps: skippedSteps || existingProgress.skippedSteps || [],
    idempotencyKey: existingProgress.idempotencyKey,
    startedAt: existingProgress.startedAt || new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  }

  // Update completed steps
  if (currentStep && !updatedProgress.completedSteps.includes(currentStep)) {
    updatedProgress.completedSteps.push(currentStep)
  }

  // Calculate expires_at (30 days from start or now if not set)
  const startedAt = existingProgress.startedAt 
    ? new Date(existingProgress.startedAt)
    : new Date()
  const expiresAt = new Date(startedAt)
  expiresAt.setDate(expiresAt.getDate() + 30)

  // Update profile (self-only)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      onboarding_progress: updatedProgress,
      onboarding_in_progress: true,
      onboarding_expires_at: expiresAt.toISOString(),
    })
    .eq('id', user.id) // CRITICAL: Self-only

  if (updateError) {
    console.error('Error saving onboarding progress:', updateError)
    // Never block navigation - return error but allow user to continue
    return NextResponse.json(
      { error: 'Failed to save progress', saved: false },
      { status: 500 }
    )
  }

  return NextResponse.json({ 
    success: true,
    saved: true,
    progress: updatedProgress,
  })
}

/**
 * DELETE: Abandon onboarding
 */
export async function DELETE() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Clear onboarding (self-only)
  const { error } = await supabase
    .from('profiles')
    .update({
      onboarding_in_progress: false,
      onboarding_progress: null,
      onboarding_expires_at: null,
      onboarding_session_id: null,
      onboarding_last_create_key: null,
    })
    .eq('id', user.id) // CRITICAL: Self-only

  if (error) {
    console.error('Error abandoning onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to abandon onboarding' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

