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
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, slug } = await request.json()

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

  // Check if slug is already taken
  const { data: existingTenant } = await serviceClient
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existingTenant) {
    return NextResponse.json(
      { error: 'Tenant slug already exists' },
      { status: 409 }
    )
  }

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

