import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/settings/permissions
 * Get all memberships (team members) for the tenant
 */
export async function GET() {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: memberships, error } = await supabase
    .from('memberships')
    .select(`
      id,
      role,
      status,
      joined_at,
      created_at,
      profiles (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching memberships:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }

  return NextResponse.json({ members: memberships || [] })
}


