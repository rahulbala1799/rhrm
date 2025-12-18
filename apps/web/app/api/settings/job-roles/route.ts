import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { calculateContrastRatio, meetsWCAGAA } from '@/lib/utils/color-contrast'

/**
 * GET /api/settings/job-roles
 * Get all active job roles for the tenant
 */
export async function GET() {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: roles, error } = await supabase
    .from('job_roles')
    .select('id, name, description, bg_color, text_color, is_active, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching job roles:', error)
    return NextResponse.json({ error: 'Failed to fetch job roles' }, { status: 500 })
  }

  return NextResponse.json({ roles: roles || [] })
}

/**
 * POST /api/settings/job-roles
 * Create a new job role
 */
export async function POST(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can create roles
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, description, bg_color, text_color } = body

  // Validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (name.length > 100) {
    return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 })
  }

  if (description && description.length > 500) {
    return NextResponse.json({ error: 'Description must be 500 characters or less' }, { status: 400 })
  }

  // Validate hex colors
  const hexColorRegex = /^#?[0-9A-Fa-f]{6}$/
  if (!bg_color || !hexColorRegex.test(bg_color)) {
    return NextResponse.json({ error: 'Background color must be a valid hex color (6 digits)' }, { status: 400 })
  }

  if (!text_color || !hexColorRegex.test(text_color)) {
    return NextResponse.json({ error: 'Text color must be a valid hex color (6 digits)' }, { status: 400 })
  }

  // Normalize hex colors (ensure # prefix)
  const normalizedBg = bg_color.startsWith('#') ? bg_color : `#${bg_color}`
  const normalizedText = text_color.startsWith('#') ? text_color : `#${text_color}`

  // Validate contrast ratio
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

  const supabase = await createClient()

  // Check for duplicate name (case-insensitive)
  const { data: existing } = await supabase
    .from('job_roles')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', name.trim())
    .eq('is_active', true)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Role name already exists' }, { status: 409 })
  }

  const { data: jobRole, error } = await supabase
    .from('job_roles')
    .insert({
      tenant_id: tenantId,
      name: name.trim(),
      description: description?.trim() || null,
      bg_color: normalizedBg,
      text_color: normalizedText,
      is_active: true,
    })
    .select('id, name, description, bg_color, text_color, is_active, created_at, updated_at')
    .single()

  if (error) {
    console.error('Error creating job role:', error)
    if (error.code === '23505') {
      // Unique constraint violation
      return NextResponse.json({ error: 'Role name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create job role' }, { status: 500 })
  }

  return NextResponse.json({ role: jobRole }, { status: 201 })
}

