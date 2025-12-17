import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * DELETE /api/settings/invitations/[id]
 * Revoke an invitation
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and superadmin can revoke invitations
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  // Verify invitation belongs to tenant
  const { data: invitation } = await supabase
    .from('invitations')
    .select('id, tenant_id, status')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  // Only revoke pending invitations
  if (invitation.status !== 'pending') {
    return NextResponse.json(
      { error: 'Can only revoke pending invitations' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('id', params.id)

  if (error) {
    console.error('Error revoking invitation:', error)
    return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}


