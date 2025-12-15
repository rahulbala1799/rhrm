import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Superadmin Operations (Server-Side Only)
 * 
 * Ops Model:
 * - Superadmin actions only via server endpoints (never client-level RLS)
 * - Every action must log actor_user_id and acting_as_user_id (or tenant)
 * - Require explicit tenant scoping per request (no "global browse")
 * - Heavy audit logging required
 */

/**
 * Superadmin: Read tenant data (read-only, explicit tenant scoping)
 * 
 * @param tenantId - REQUIRED: Explicit tenant scope (no global access)
 * @param resourceType - Type of resource to read (staff, shifts, etc.)
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // CRITICAL: Superadmin identity is NOT membership-based
  // Check platform_admins allowlist (platform-level, not tenant-level)
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

  const { data: platformAdmin } = await serviceClient
    .from('platform_admins')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!platformAdmin) {
    return NextResponse.json(
      { error: 'Superadmin access required - not in platform admins allowlist' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')
  const resourceType = searchParams.get('resourceType')

  // Require explicit tenant scoping (no global browse)
  if (!tenantId) {
    return NextResponse.json(
      { error: 'tenantId parameter required for superadmin access' },
      { status: 400 }
    )
  }

  // Service client already created above for platform_admins check
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // Fetch data (bypasses RLS via service role)
  let data
  if (resourceType && ['staff', 'shifts', 'timesheets'].includes(resourceType)) {
    const { data: result, error } = await serviceClient
      .from(resourceType)
      .select('*')
      .eq('tenant_id', tenantId)
      .limit(100) // Limit results

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    data = result
  } else {
    // Default: return tenant info
    const { data: tenant, error } = await serviceClient
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    data = tenant
  }

  // Log superadmin action with explicit scoping
  await serviceClient.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: user.id, // Actor
    action: 'view',
    resource_type: resourceType || 'tenant',
    changes: {
      superadmin_action: true,
      actor_user_id: user.id,
      scoped_tenant_id: tenantId,
    },
  })

  return NextResponse.json({ data })
}

/**
 * Superadmin: Impersonate user (acting_as)
 * 
 * @param tenantId - REQUIRED: Explicit tenant scope
 * @param actingAsUserId - User to impersonate
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // CRITICAL: Superadmin identity is NOT membership-based
  // Check platform_admins allowlist (platform-level, not tenant-level)
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

  const { data: platformAdmin } = await serviceClient
    .from('platform_admins')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!platformAdmin) {
    return NextResponse.json(
      { error: 'Superadmin access required - not in platform admins allowlist' },
      { status: 403 }
    )
  }

  const { tenantId, actingAsUserId, action, resourceType, resourceId } = await request.json()

  if (!tenantId || !actingAsUserId) {
    return NextResponse.json(
      { error: 'tenantId and actingAsUserId required' },
      { status: 400 }
    )
  }

  // Verify target user has membership in tenant
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

  const { data: targetMembership } = await serviceClient
    .from('memberships')
    .select('id')
    .eq('user_id', actingAsUserId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single()

  if (!targetMembership) {
    return NextResponse.json(
      { error: 'Target user does not have access to this tenant' },
      { status: 403 }
    )
  }

  // Log impersonation action with both actor and acting_as
  await serviceClient.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: user.id, // Actor (superadmin)
    action: action || 'impersonate',
    resource_type: resourceType || 'user',
    resource_id: resourceId || actingAsUserId,
    changes: {
      superadmin_action: true,
      actor_user_id: user.id,
      acting_as_user_id: actingAsUserId,
      scoped_tenant_id: tenantId,
    },
  })

  return NextResponse.json({
    success: true,
    message: 'Action logged with impersonation metadata',
  })
}

