import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/me/tenant
 * Get current user's tenant information
 */
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ tenant: null })
  }

  // Get tenant details
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching tenant:', error)
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 })
  }

  return NextResponse.json({ tenant })
}

