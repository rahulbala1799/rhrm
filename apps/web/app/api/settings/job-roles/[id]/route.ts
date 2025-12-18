import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { calculateContrastRatio, meetsWCAGAA } from '@/lib/utils/color-contrast'

/**
 * PUT /api/settings/job-roles/[id]
 * Update a job role
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
  const { name, description, bg_color, text_color } = body

  const supabase = await createClient()

  // Verify role exists and belongs to tenant
  const { data: existing } = await supabase
    .from('job_roles')
    .select('id, tenant_id, name, bg_color, text_color')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  const updates: any = {}

  // Validate and update name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 })
    }

    // Check for duplicate name (case-insensitive, excluding current role)
    if (name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const { data: duplicate } = await supabase
        .from('job_roles')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('name', name.trim())
        .eq('is_active', true)
        .neq('id', params.id)
        .single()

      if (duplicate) {
        return NextResponse.json({ error: 'Role name already exists' }, { status: 409 })
      }
    }

    updates.name = name.trim()
  }

  // Validate and update description if provided
  if (description !== undefined) {
    if (description && description.length > 500) {
      return NextResponse.json({ error: 'Description must be 500 characters or less' }, { status: 400 })
    }
    updates.description = description?.trim() || null
  }

  // Validate and update colors if provided
  const hexColorRegex = /^#?[0-9A-Fa-f]{6}$/
  let normalizedBg = existing.bg_color
  let normalizedText = existing.text_color

  if (bg_color !== undefined) {
    if (!hexColorRegex.test(bg_color)) {
      return NextResponse.json({ error: 'Background color must be a valid hex color (6 digits)' }, { status: 400 })
    }
    normalizedBg = bg_color.startsWith('#') ? bg_color : `#${bg_color}`
    updates.bg_color = normalizedBg
  }

  if (text_color !== undefined) {
    if (!hexColorRegex.test(text_color)) {
      return NextResponse.json({ error: 'Text color must be a valid hex color (6 digits)' }, { status: 400 })
    }
    normalizedText = text_color.startsWith('#') ? text_color : `#${text_color}`
    updates.text_color = normalizedText
  }

  // Validate contrast ratio if both colors are being updated or one is updated
  if (bg_color !== undefined || text_color !== undefined) {
    try {
      const contrastRatio = calculateContrastRatio(normalizedBg, normalizedText)
      if (!meetsWCAGAA(normalizedBg, normalizedText)) {
        return NextResponse.json(
          {
            error: 'Insufficient color contrast',
            message: `Contrast ratio is ${contrastRatio.toFixed(2)}:1. WCAG AA requires minimum 4.5:1`,
            contrast_ratio: contrastRatio,
          },
          { status: 400 }
        )
      }
    } catch (err: any) {
      return NextResponse.json({ error: `Invalid color format: ${err.message}` }, { status: 400 })
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: updatedRole, error } = await supabase
    .from('job_roles')
    .update(updates)
    .eq('id', params.id)
    .select('id, name, description, bg_color, text_color, is_active, created_at, updated_at')
    .single()

  if (error) {
    console.error('Error updating job role:', error)
    return NextResponse.json({ error: 'Failed to update job role' }, { status: 500 })
  }

  return NextResponse.json({ role: updatedRole })
}

/**
 * DELETE /api/settings/job-roles/[id]
 * Soft delete a job role (set is_active = false)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can delete roles
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'

  const supabase = await createClient()

  // Verify role exists and belongs to tenant
  const { data: existing } = await supabase
    .from('job_roles')
    .select('id, tenant_id')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  // Check if role is assigned to any staff
  const { data: staffAssignments, error: staffError } = await supabase
    .from('staff_roles')
    .select(`
      staff_id,
      staff:staff_id (
        id,
        first_name,
        last_name,
        preferred_name
      )
    `)
    .eq('role_id', params.id)
    .eq('tenant_id', tenantId)

  if (staffError) {
    console.error('Error checking staff assignments:', staffError)
    return NextResponse.json({ error: 'Failed to check staff assignments' }, { status: 500 })
  }

  const assignedCount = staffAssignments?.length || 0

  // If role is assigned and force=false, return error with staff list
  if (assignedCount > 0 && !force) {
    const staffList = (staffAssignments || []).map((assignment: any) => ({
      id: assignment.staff_id,
      name: assignment.staff?.preferred_name || 
            `${assignment.staff?.first_name || ''} ${assignment.staff?.last_name || ''}`.trim() ||
            'Unknown',
    }))

    return NextResponse.json(
      {
        error: 'Role is assigned to staff',
        message: `This role is assigned to ${assignedCount} staff member${assignedCount > 1 ? 's' : ''}`,
        staff_count: assignedCount,
        staff: staffList,
      },
      { status: 409 }
    )
  }

  // Soft delete the role
  const { error: deleteError } = await supabase
    .from('job_roles')
    .update({ is_active: false })
    .eq('id', params.id)

  if (deleteError) {
    console.error('Error deleting job role:', deleteError)
    return NextResponse.json({ error: 'Failed to delete job role' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Role deleted successfully',
  })
}

