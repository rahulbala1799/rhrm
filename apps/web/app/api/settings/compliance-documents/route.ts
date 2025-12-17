import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/settings/compliance-documents
 * Get compliance requirements for tenant + country
 */
export async function GET(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country') as 'UK' | 'IE' | 'US' | null

  if (!country || !['UK', 'IE', 'US'].includes(country)) {
    return NextResponse.json({ error: 'Invalid country code. Must be UK, IE, or US.' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: requirements, error } = await supabase
    .from('tenant_compliance_requirements')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('country_code', country)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching requirements:', error)
    return NextResponse.json({ error: 'Failed to fetch requirements' }, { status: 500 })
  }

  return NextResponse.json({ requirements: requirements || [] })
}

/**
 * POST /api/settings/compliance-documents
 * Create new requirement (admin only)
 */
export async function POST(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and superadmin can create requirements
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const {
    country_code,
    doc_type,
    title,
    requirement_level,
    collection_method,
    expires_in_months,
    applies_to_all,
    role_ids,
    location_ids,
    is_enabled,
    sort_order,
  } = body

  // Validate required fields
  if (!country_code || !doc_type || !title || !requirement_level || !collection_method) {
    return NextResponse.json(
      { error: 'Missing required fields: country_code, doc_type, title, requirement_level, collection_method' },
      { status: 400 }
    )
  }

  // Validate enum values
  if (!['UK', 'IE', 'US'].includes(country_code)) {
    return NextResponse.json({ error: 'Invalid country_code' }, { status: 400 })
  }
  if (!['required', 'conditional', 'optional'].includes(requirement_level)) {
    return NextResponse.json({ error: 'Invalid requirement_level' }, { status: 400 })
  }
  if (!['upload', 'reference', 'both'].includes(collection_method)) {
    return NextResponse.json({ error: 'Invalid collection_method' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: requirement, error } = await supabase
    .from('tenant_compliance_requirements')
    .insert({
      tenant_id: tenantId,
      country_code,
      doc_type,
      title,
      requirement_level,
      collection_method,
      expires_in_months: expires_in_months || null,
      applies_to_all: applies_to_all !== undefined ? applies_to_all : true,
      role_ids: role_ids || null,
      location_ids: location_ids || null,
      is_enabled: is_enabled !== undefined ? is_enabled : true,
      sort_order: sort_order || 100,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating requirement:', error)
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A requirement with this doc_type already exists for this country' },
        { status: 409 }
      )
    }
    
    return NextResponse.json({ error: 'Failed to create requirement' }, { status: 500 })
  }

  return NextResponse.json({ requirement }, { status: 201 })
}

