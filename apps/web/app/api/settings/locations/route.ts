import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/settings/locations
 * Get all locations for the tenant
 */
export async function GET() {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: locations, error } = await supabase
    .from('locations')
    .select('id, name, address, postcode, phone, settings, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }

  return NextResponse.json({ locations: locations || [] })
}

/**
 * POST /api/settings/locations
 * Create a new location
 */
export async function POST(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can create locations
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, address, postcode, phone, settings } = body

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: location, error } = await supabase
    .from('locations')
    .insert({
      tenant_id: tenantId,
      name,
      address: address || null,
      postcode: postcode || null,
      phone: phone || null,
      settings: settings || {},
    })
    .select('id, name, address, postcode, phone, settings, created_at')
    .single()

  if (error) {
    console.error('Error creating location:', error)
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
  }

  return NextResponse.json({ location }, { status: 201 })
}

