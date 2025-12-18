import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/staff/[id]/locations
 * Get all locations assigned to a staff member
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Verify staff belongs to tenant
  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  const { data: staffLocations, error } = await supabase
    .from('staff_locations')
    .select(`
      id,
      location_id,
      assigned_at,
      locations:location_id (
        id,
        name,
        address,
        postcode
      )
    `)
    .eq('staff_id', params.id)
    .eq('tenant_id', tenantId)
    .order('assigned_at', { ascending: true })

  if (error) {
    console.error('Error fetching staff locations:', error)
    return NextResponse.json({ error: 'Failed to fetch staff locations' }, { status: 500 })
  }

  // Transform to match API spec
  const locations = (staffLocations || []).map((sl: any) => ({
    id: sl.locations?.id,
    name: sl.locations?.name,
    address: sl.locations?.address,
    postcode: sl.locations?.postcode,
    assigned_at: sl.assigned_at,
  })).filter((l: any) => l.id) // Filter out any null locations (if location was deleted)

  return NextResponse.json({ locations })
}

/**
 * POST /api/staff/[id]/locations
 * Assign a location to a staff member
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can assign locations
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { location_id } = body

  if (!location_id) {
    return NextResponse.json({ error: 'location_id is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify staff belongs to tenant
  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  // Verify location exists and belongs to tenant
  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('id', location_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  // Check if location is already assigned
  const { data: existing } = await supabase
    .from('staff_locations')
    .select('id')
    .eq('staff_id', params.id)
    .eq('location_id', location_id)
    .eq('tenant_id', tenantId)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Location already assigned to this staff member' }, { status: 409 })
  }

  // Get current user for assigned_by
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: staffLocation, error } = await supabase
    .from('staff_locations')
    .insert({
      tenant_id: tenantId,
      staff_id: params.id,
      location_id,
      assigned_by: user?.id || null,
    })
    .select('id, staff_id, location_id, assigned_at')
    .single()

  if (error) {
    console.error('Error assigning location:', error)
    if (error.code === '23505') {
      // Unique constraint violation
      return NextResponse.json({ error: 'Location already assigned to this staff member' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to assign location' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Location assigned successfully',
    staff_location: staffLocation,
  }, { status: 201 })
}

/**
 * PUT /api/staff/[id]/locations
 * Replace all locations for a staff member (bulk update)
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can update locations
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { location_ids } = body

  if (!Array.isArray(location_ids)) {
    return NextResponse.json({ error: 'location_ids must be an array' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify staff belongs to tenant
  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  // Verify all locations exist and belong to tenant
  if (location_ids.length > 0) {
    const { data: locations } = await supabase
      .from('locations')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('id', location_ids)

    if (!locations || locations.length !== location_ids.length) {
      return NextResponse.json({ error: 'One or more locations not found' }, { status: 404 })
    }
  }

  // Get current user for assigned_by
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Delete all existing assignments
  const { error: deleteError } = await supabase
    .from('staff_locations')
    .delete()
    .eq('staff_id', params.id)
    .eq('tenant_id', tenantId)

  if (deleteError) {
    console.error('Error deleting existing locations:', deleteError)
    return NextResponse.json({ error: 'Failed to update locations' }, { status: 500 })
  }

  // Insert new assignments
  if (location_ids.length > 0) {
    const assignments = location_ids.map((locationId: string) => ({
      tenant_id: tenantId,
      staff_id: params.id,
      location_id: locationId,
      assigned_by: user?.id || null,
    }))

    const { error: insertError } = await supabase
      .from('staff_locations')
      .insert(assignments)

    if (insertError) {
      console.error('Error assigning locations:', insertError)
      return NextResponse.json({ error: 'Failed to assign locations' }, { status: 500 })
    }
  }

  // Fetch updated locations
  const { data: staffLocations } = await supabase
    .from('staff_locations')
    .select(`
      locations:location_id (
        id,
        name,
        address,
        postcode
      )
    `)
    .eq('staff_id', params.id)
    .eq('tenant_id', tenantId)

  const locations = (staffLocations || []).map((sl: any) => ({
    id: sl.locations?.id,
    name: sl.locations?.name,
    address: sl.locations?.address,
    postcode: sl.locations?.postcode,
  })).filter((l: any) => l.id)

  return NextResponse.json({
    success: true,
    message: 'Locations updated successfully',
    locations,
  })
}

