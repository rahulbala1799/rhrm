import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { getRecommendedDefaults, createRequirementFromSeed } from '@/lib/compliance/seed-defaults'
import type { CountryCode } from '@/lib/compliance/types'

/**
 * POST /api/settings/compliance-documents/seed
 * Auto-seed recommended defaults for a country (admin only)
 */
export async function POST(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { country } = body

  if (!country || !['UK', 'IE', 'US'].includes(country)) {
    return NextResponse.json({ error: 'Invalid country code. Must be UK, IE, or US.' }, { status: 400 })
  }

  const supabase = await createClient()

  // Check if requirements already exist for this country
  const { data: existing } = await supabase
    .from('tenant_compliance_requirements')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('country_code', country)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'Requirements already exist for this country. Delete existing requirements first or add manually.' },
      { status: 409 }
    )
  }

  // Get recommended defaults for country
  const defaults = getRecommendedDefaults(country as CountryCode)
  
  if (defaults.length === 0) {
    return NextResponse.json({ error: 'No defaults available for this country' }, { status: 400 })
  }

  // Create requirements from seed data
  const requirementsToInsert = defaults.map(seed => 
    createRequirementFromSeed(tenantId, country as CountryCode, seed)
  )

  const { data: requirements, error } = await supabase
    .from('tenant_compliance_requirements')
    .insert(requirementsToInsert)
    .select()

  if (error) {
    console.error('Error seeding requirements:', error)
    return NextResponse.json({ error: 'Failed to seed requirements' }, { status: 500 })
  }

  return NextResponse.json({ 
    requirements,
    message: `Successfully seeded ${requirements.length} requirements for ${country}`
  }, { status: 201 })
}



