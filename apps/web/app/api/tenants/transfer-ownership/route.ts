import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * Transfer Tenant Ownership (Server-Side Only)
 * 
 * Allows tenant owner to safely transfer ownership to another user.
 * Includes safety checks to prevent orphaned tenants.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const context = await getTenantContext()
  if (!context.tenantId) {
    return NextResponse.json({ error: 'No active tenant' }, { status: 400 })
  }

  const { newOwnerUserId, demoteOldOwner } = await request.json()

  if (!newOwnerUserId) {
    return NextResponse.json(
      { error: 'newOwnerUserId required' },
      { status: 400 }
    )
  }

  // Verify current user is the owner (server-side check)
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

  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('owner_user_id')
    .eq('id', context.tenantId)
    .single()

  if (!tenant || tenant.owner_user_id !== user.id) {
    return NextResponse.json(
      { error: 'Only the tenant owner can transfer ownership' },
      { status: 403 }
    )
  }

  // Call database function to perform transfer (includes all safety checks)
  const { data: result, error } = await serviceClient.rpc(
    'transfer_tenant_ownership',
    {
      p_tenant_id: context.tenantId,
      p_current_owner_id: user.id,
      p_new_owner_id: newOwnerUserId,
      p_demote_old_owner: demoteOldOwner || false,
    }
  )

  if (error) {
    console.error('Error transferring ownership:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to transfer ownership' },
      { status: 500 }
    )
  }

  if (!result || result.length === 0 || !result[0].success) {
    return NextResponse.json(
      { error: result?.[0]?.message || 'Transfer failed' },
      { status: 400 }
    )
  }

  // Log to audit with full context
  await serviceClient.from('audit_logs').insert({
    tenant_id: context.tenantId,
    user_id: user.id,
    action: 'update',
    resource_type: 'tenant_ownership',
    resource_id: context.tenantId,
    changes: {
      old_owner_id: user.id,
      new_owner_id: newOwnerUserId,
      demote_old_owner: demoteOldOwner || false,
      transfer_method: 'api_endpoint',
    },
  })

  return NextResponse.json({
    success: true,
    message: result[0].message,
    tenantId: context.tenantId,
    newOwnerId: newOwnerUserId,
  })
}

