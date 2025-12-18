import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { SupportedCurrency } from '@/lib/currency/utils'

/**
 * GET /api/settings/company
 * Get company settings (tenant info)
 */
export async function GET() {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name, slug, settings, created_at')
    .eq('id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching tenant:', error)
    return NextResponse.json({ error: 'Failed to fetch company settings' }, { status: 500 })
  }

  return NextResponse.json({ tenant })
}

/**
 * PUT /api/settings/company
 * Update company settings
 */
export async function PUT(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and superadmin can update company settings
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, slug, settings } = body

  // Validate currency if provided
  if (settings?.currency) {
    const validCurrencies: SupportedCurrency[] = ['USD', 'EUR', 'GBP']
    if (!validCurrencies.includes(settings.currency)) {
      return NextResponse.json(
        { error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}` },
        { status: 400 }
      )
    }
  }

  const supabase = await createClient()

  // Build update object
  const updates: any = {}
  if (name !== undefined) updates.name = name
  if (slug !== undefined) {
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'slug must be lowercase alphanumeric with hyphens only' },
        { status: 400 }
      )
    }
    // Check if slug is already taken by another tenant
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .neq('id', tenantId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
    }
    updates.slug = slug
  }
  if (settings !== undefined) {
    // Merge with existing settings
    const { data: current } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single()

    updates.settings = { ...(current?.settings || {}), ...settings }
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .select('id, name, slug, settings, updated_at')
    .single()

  if (error) {
    console.error('Error updating tenant:', error)
    return NextResponse.json({ error: 'Failed to update company settings' }, { status: 500 })
  }

  return NextResponse.json({ tenant })
}




