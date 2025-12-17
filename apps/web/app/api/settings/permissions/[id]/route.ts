import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * PUT /api/settings/permissions/[id]
 * Update a membership (role or status)
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role: userRole } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and superadmin can update memberships
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { role, status } = body

  const supabase = await createClient()

  // Get current user to prevent self-modification
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify membership belongs to tenant
  const { data: membership } = await supabase
    .from('memberships')
    .select('id, tenant_id, user_id, role, status')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
  }

  // Prevent self-modification
  if (membership.user_id === user.id) {
    return NextResponse.json(
      { error: 'Cannot modify your own membership' },
      { status: 403 }
    )
  }

  // Prevent modifying owner's membership
  const { data: tenant } = await supabase
    .from('tenants')
    .select('owner_user_id')
    .eq('id', tenantId)
    .single()

  if (tenant?.owner_user_id === membership.user_id) {
    return NextResponse.json(
      { error: 'Cannot modify the owner\'s membership' },
      { status: 403 }
    )
  }

  // Validate role
  if (role && !['admin', 'manager', 'staff'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Validate status
  if (status && !['active', 'suspended'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Prevent changing status to 'active' from client (only via invitation acceptance)
  if (status === 'active' && membership.status !== 'active') {
    return NextResponse.json(
      { error: 'Cannot activate membership. User must accept invitation.' },
      { status: 403 }
    )
  }

  const updates: any = {}
  if (role !== undefined) updates.role = role
  if (status !== undefined) updates.status = status

  const { data: updated, error } = await supabase
    .from('memberships')
    .update(updates)
    .eq('id', params.id)
    .select('id, role, status, updated_at')
    .single()

  if (error) {
    console.error('Error updating membership:', error)
    return NextResponse.json({ error: 'Failed to update membership' }, { status: 500 })
  }

  return NextResponse.json({ membership: updated })
}



