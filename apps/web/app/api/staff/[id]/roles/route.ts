import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/staff/[id]/roles
 * Get all roles assigned to a staff member
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

  const { data: staffRoles, error } = await supabase
    .from('staff_roles')
    .select(`
      id,
      role_id,
      assigned_at,
      job_roles:role_id (
        id,
        name,
        description,
        bg_color,
        text_color
      )
    `)
    .eq('staff_id', params.id)
    .eq('tenant_id', tenantId)
    .order('assigned_at', { ascending: true })

  if (error) {
    console.error('Error fetching staff roles:', error)
    return NextResponse.json({ error: 'Failed to fetch staff roles' }, { status: 500 })
  }

  // Transform to match API spec
  const roles = (staffRoles || []).map((sr: any) => ({
    id: sr.job_roles?.id,
    name: sr.job_roles?.name,
    description: sr.job_roles?.description,
    bg_color: sr.job_roles?.bg_color,
    text_color: sr.job_roles?.text_color,
    assigned_at: sr.assigned_at,
  })).filter((r: any) => r.id) // Filter out any null roles (if role was deleted)

  return NextResponse.json({ roles })
}

/**
 * POST /api/staff/[id]/roles
 * Assign a role to a staff member
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can assign roles
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { role_id } = body

  if (!role_id) {
    return NextResponse.json({ error: 'role_id is required' }, { status: 400 })
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

  // Verify role exists and belongs to tenant
  const { data: jobRole } = await supabase
    .from('job_roles')
    .select('id, is_active')
    .eq('id', role_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!jobRole) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  if (!jobRole.is_active) {
    return NextResponse.json({ error: 'Cannot assign inactive role' }, { status: 400 })
  }

  // Check if role is already assigned
  const { data: existing } = await supabase
    .from('staff_roles')
    .select('id')
    .eq('staff_id', params.id)
    .eq('role_id', role_id)
    .eq('tenant_id', tenantId)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Role already assigned to this staff member' }, { status: 409 })
  }

  // Get current user for assigned_by
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: staffRole, error } = await supabase
    .from('staff_roles')
    .insert({
      tenant_id: tenantId,
      staff_id: params.id,
      role_id,
      assigned_by: user?.id || null,
    })
    .select('id, staff_id, role_id, assigned_at')
    .single()

  if (error) {
    console.error('Error assigning role:', error)
    if (error.code === '23505') {
      // Unique constraint violation
      return NextResponse.json({ error: 'Role already assigned to this staff member' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Role assigned successfully',
    staff_role: staffRole,
  }, { status: 201 })
}

/**
 * PUT /api/staff/[id]/roles
 * Replace all roles for a staff member (bulk update)
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can update roles
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { role_ids } = body

  if (!Array.isArray(role_ids)) {
    return NextResponse.json({ error: 'role_ids must be an array' }, { status: 400 })
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

  // Verify all roles exist and belong to tenant
  if (role_ids.length > 0) {
    const { data: roles } = await supabase
      .from('job_roles')
      .select('id, is_active')
      .eq('tenant_id', tenantId)
      .in('id', role_ids)

    if (!roles || roles.length !== role_ids.length) {
      return NextResponse.json({ error: 'One or more roles not found' }, { status: 404 })
    }

    const inactiveRoles = roles.filter((r) => !r.is_active)
    if (inactiveRoles.length > 0) {
      return NextResponse.json({ error: 'Cannot assign inactive roles' }, { status: 400 })
    }
  }

  // Get current user for assigned_by
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Delete all existing assignments
  const { error: deleteError } = await supabase
    .from('staff_roles')
    .delete()
    .eq('staff_id', params.id)
    .eq('tenant_id', tenantId)

  if (deleteError) {
    console.error('Error deleting existing roles:', deleteError)
    return NextResponse.json({ error: 'Failed to update roles' }, { status: 500 })
  }

  // Insert new assignments
  if (role_ids.length > 0) {
    const assignments = role_ids.map((roleId: string) => ({
      tenant_id: tenantId,
      staff_id: params.id,
      role_id: roleId,
      assigned_by: user?.id || null,
    }))

    const { error: insertError } = await supabase
      .from('staff_roles')
      .insert(assignments)

    if (insertError) {
      console.error('Error assigning roles:', insertError)
      return NextResponse.json({ error: 'Failed to assign roles' }, { status: 500 })
    }
  }

  // Fetch updated roles
  const { data: staffRoles } = await supabase
    .from('staff_roles')
    .select(`
      job_roles:role_id (
        id,
        name,
        description,
        bg_color,
        text_color
      )
    `)
    .eq('staff_id', params.id)
    .eq('tenant_id', tenantId)

  const roles = (staffRoles || []).map((sr: any) => ({
    id: sr.job_roles?.id,
    name: sr.job_roles?.name,
    description: sr.job_roles?.description,
    bg_color: sr.job_roles?.bg_color,
    text_color: sr.job_roles?.text_color,
  })).filter((r: any) => r.id)

  return NextResponse.json({
    success: true,
    message: 'Roles updated successfully',
    roles,
  })
}

