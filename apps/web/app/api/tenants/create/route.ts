import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Create new tenant + first admin membership (atomic operation)
 * 
 * CANONICAL FLOW: This is the ONLY allowed path for tenant creation.
 * - API endpoint calls database function create_tenant_with_admin()
 * - Database function ensures atomicity (both succeed or both fail)
 * - No other path is allowed - prevents devs from adding "quick tenant creation" elsewhere
 * 
 * This avoids the deadlock:
 * - User signs up but can't create tenant (not a member)
 * - Can't create membership (no tenant exists)
 * 
 * Uses service role to bypass RLS for this initial setup.
 * 
 * Extended with onboarding checks, settings storage, and idempotency.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { 
    name, 
    slug, 
    idempotencyKey,
    sessionId,
    // Onboarding data
    businessType,
    companyRegistrationNumber,
    vatNumber,
    country,
    teamSize,
    teamStructure,
    workModel,
    workHours,
    weekStructure,
    complianceFlags,
    skippedSteps,
    locations,
  } = body

  if (!name || !slug) {
    return NextResponse.json(
      { error: 'name and slug required' },
      { status: 400 }
    )
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: 'slug must be lowercase alphanumeric with hyphens only' },
      { status: 400 }
    )
  }

  // Use service role client for atomic tenant + membership creation
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

  // Pre-flight checks (in order)
  
  // 1. Check for existing active membership (source of truth)
  const { data: activeMembership } = await serviceClient
    .from('memberships')
    .select('tenant_id, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (activeMembership) {
    return NextResponse.json(
      { error: 'You already have a business account' },
      { status: 409 }
    )
  }

  // 2. Check for existing tenant ownership (source of truth)
  const { data: ownedTenant } = await serviceClient
    .from('tenants')
    .select('id')
    .eq('owner_user_id', user.id)
    .limit(1)
    .single()

  if (ownedTenant) {
    return NextResponse.json(
      { error: 'You already own a business' },
      { status: 409 }
    )
  }

  // 3. Check for invited-only memberships (allow but warn)
  const { data: invitedMemberships } = await serviceClient
    .from('memberships')
    .select('tenant_id, status, tenants(name)')
    .eq('user_id', user.id)
    .eq('status', 'invited')

  const hasInvitedMemberships = invitedMemberships && invitedMemberships.length > 0

  // 4. Check onboarding_in_progress and sessionId
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('onboarding_in_progress, onboarding_session_id, onboarding_last_create_key, onboarding_progress')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_in_progress) {
    if (sessionId && profile.onboarding_session_id !== sessionId) {
      return NextResponse.json(
        { error: 'Onboarding already in progress in another tab/device. Please complete or abandon your current setup.' },
        { status: 409 }
      )
    }
    
    // Check expiration
    const progress = profile.onboarding_progress as any
    if (progress?.startedAt) {
      const expiresAt = new Date(progress.startedAt)
      expiresAt.setDate(expiresAt.getDate() + 30)
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Onboarding session expired. Please start over.' },
          { status: 409 }
        )
      }
    }
  }

  // 5. Idempotency check: if last_create_key matches, return existing tenant
  if (idempotencyKey && profile?.onboarding_last_create_key === idempotencyKey) {
    // Find existing tenant for this user
    const { data: existingTenant } = await serviceClient
      .from('tenants')
      .select('id, name, slug')
      .eq('owner_user_id', user.id)
      .limit(1)
      .single()

    if (existingTenant) {
      return NextResponse.json({
        success: true,
        tenant: existingTenant,
        idempotent: true,
      })
    }
  }

  // Check if slug is already taken
  const { data: existingTenantBySlug } = await serviceClient
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existingTenantBySlug) {
    return NextResponse.json(
      { error: 'Slug taken, pick another', slugTaken: true },
      { status: 409 }
    )
  }

  // Prepare tenant settings
  const settings: any = {}
  if (businessType) settings.businessType = businessType
  if (companyRegistrationNumber) settings.companyRegistrationNumber = companyRegistrationNumber
  if (vatNumber) settings.vatNumber = vatNumber
  if (country) settings.country = country
  if (teamSize) settings.teamSize = teamSize
  if (teamStructure) settings.teamStructure = teamStructure
  if (workModel) settings.workModel = workModel
  if (workHours) settings.workHours = workHours
  if (weekStructure) settings.weekStructure = weekStructure
  if (complianceFlags) settings.complianceFlags = complianceFlags
  if (skippedSteps) settings.skippedOnboardingSteps = skippedSteps
  settings.onboardingCompletedAt = new Date().toISOString()

  // CANONICAL FLOW: API endpoint calls database function
  // This is the ONLY allowed path - no other tenant creation mechanism
  // Database function ensures atomicity (both tenant and membership created together)
  const { data: result, error } = await serviceClient.rpc(
    'create_tenant_with_admin',
    {
      p_tenant_name: name,
      p_tenant_slug: slug,
      p_admin_user_id: user.id,
    }
  )

  if (error) {
    console.error('Error creating tenant:', error)
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    )
  }

  // Update tenant with settings
  if (Object.keys(settings).length > 0) {
    await serviceClient
      .from('tenants')
      .update({ settings })
      .eq('id', result.tenant_id)
  }

  // CRITICAL: Clear onboarding progress in same request (even if locations fail)
  // This wipes sensitive data immediately
  await serviceClient
    .from('profiles')
    .update({
      onboarding_in_progress: false,
      onboarding_progress: null,
      onboarding_expires_at: null,
      onboarding_session_id: null,
      onboarding_last_create_key: idempotencyKey || null,
    })
    .eq('id', user.id)

  // Create locations (non-atomic - can fail individually)
  const locationErrors: any[] = []
  if (locations && Array.isArray(locations)) {
    // First, unset any existing defaults if we're adding a default location
    const hasDefault = locations.some((loc: any) => loc.isDefault)
    if (hasDefault) {
      const { data: existingLocations } = await serviceClient
        .from('locations')
        .select('id, settings')
        .eq('tenant_id', result.tenant_id)

      if (existingLocations) {
        for (const loc of existingLocations) {
          const settings = (loc.settings as any) || {}
          if (settings.isDefault) {
            await serviceClient
              .from('locations')
              .update({
                settings: { ...settings, isDefault: false },
              })
              .eq('id', loc.id)
          }
        }
      }
    }

    for (const location of locations) {
      try {
        const settings: any = {
          addressLine1: location.addressLine1,
          city: location.city,
          country: location.country || country,
          isDefault: location.isDefault || false,
        }

        const { error: locationError } = await serviceClient
          .from('locations')
          .insert({
            tenant_id: result.tenant_id,
            name: location.name,
            address: location.addressLine1,
            postcode: location.postcode,
            phone: location.phone || null,
            settings,
          })

        if (locationError) {
          locationErrors.push({
            location: location.name,
            error: locationError.message,
          })
        }
      } catch (err: any) {
        locationErrors.push({
          location: location.name,
          error: err.message,
        })
      }
    }
  }

  // Log to audit (system action)
  await serviceClient.from('audit_logs').insert({
    tenant_id: result.tenant_id,
    user_id: user.id,
    action: 'create',
    resource_type: 'tenant',
    resource_id: result.tenant_id,
    changes: {
      name,
      slug,
      created_by: user.id,
      onboarding_completed: true,
    },
  })

  // Set active tenant cookie
  const response = NextResponse.json({
    success: true,
    tenant: {
      id: result.tenant_id,
      name,
      slug,
    },
    membership: {
      id: result.membership_id,
      role: 'admin',
    },
    locationErrors: locationErrors.length > 0 ? locationErrors : undefined,
    warnedInvite: hasInvitedMemberships,
  })

  // Set active tenant cookie
  response.cookies.set('active_tenant_id', result.tenant_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  return response
}

