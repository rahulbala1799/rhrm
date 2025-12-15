import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Self-Leave Tenant (Server-Side Only)
 * 
 * Allows users to leave a tenant they belong to, with safety checks:
 * - Owner cannot leave (must transfer ownership first)
 * - Last admin cannot leave (must promote another admin first)
 * 
 * Uses service role to call database function with proper safety checks.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tenantId } = await request.json()

  if (!tenantId) {
    return NextResponse.json(
      { error: 'tenantId required' },
      { status: 400 }
    )
  }

  // Verify user has membership in this tenant
  const { data: membership } = await supabase
    .from('memberships')
    .select('id, role, status')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    return NextResponse.json(
      { error: 'You do not have an active membership in this tenant' },
      { status: 403 }
    )
  }

  // Use service role client to call self-leave function
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

  // Call self-leave function (includes all safety checks)
  const { data: result, error } = await serviceClient.rpc(
    'self_leave_tenant',
    {
      p_tenant_id: tenantId,
      p_user_id: user.id,
    }
  )

  if (error) {
    console.error('Error leaving tenant:', error)
    return NextResponse.json(
      { error: 'Failed to leave tenant' },
      { status: 500 }
    )
  }

  // Check function result
  const leaveResult = Array.isArray(result) ? result[0] : result
  if (!leaveResult?.success) {
    return NextResponse.json(
      { error: leaveResult?.message || 'Cannot leave tenant' },
      { status: 400 }
    )
  }

  // Log to audit
  await serviceClient.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: user.id,
    action: 'update',
    resource_type: 'membership',
    resource_id: membership.id,
    changes: {
      action: 'self_leave',
      old_status: 'active',
      new_status: 'suspended',
      left_tenant: true,
    },
  })

  // Clear active tenant cookie if it matches
  const response = NextResponse.json({
    success: true,
    message: leaveResult.message,
  })

  // Clear active tenant cookie if it was set to this tenant
  response.cookies.delete('active_tenant_id')

  return response
}

