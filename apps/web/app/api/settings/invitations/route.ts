import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/settings/invitations
 * Get all invitations for the tenant
 */
export async function GET() {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: invitations, error } = await supabase
    .from('invitations')
    .select(`
      id,
      email,
      role,
      status,
      expires_at,
      accepted_at,
      created_at,
      profiles!invitations_invited_by_fkey (
        id,
        email,
        full_name
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
  }

  return NextResponse.json({ invitations: invitations || [] })
}


