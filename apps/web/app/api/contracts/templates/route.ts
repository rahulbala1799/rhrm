import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { STANDARD_IE_TEMPLATES } from '@/lib/contracts/standard-templates'

/**
 * GET /api/contracts/templates
 * List contract templates for the tenant. Ensures standard IE templates exist if none.
 */
export async function GET() {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: templates, error } = await supabase
    .from('contract_templates')
    .select('id, template_id, name, jurisdiction, version, packs_enabled, is_standard, generator_schema, created_at')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }

  // If no templates, ensure standard IE templates for this tenant
  if (!templates?.length) {
    const inserted = await ensureStandardTemplates(supabase, tenantId)
    return NextResponse.json({ templates: inserted })
  }

  return NextResponse.json({ templates: templates ?? [] })
}

/**
 * Ensure standard IE templates exist for the tenant. Returns the list of templates (existing + newly inserted).
 */
export async function ensureStandardTemplates(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>, tenantId: string) {
  const rows = STANDARD_IE_TEMPLATES.map((t) => ({
    tenant_id: tenantId,
    template_id: t.template_id,
    name: t.name,
    jurisdiction: t.jurisdiction,
    version: t.version,
    packs_enabled: t.packs_enabled as string[],
    generator_schema: t.generator_schema as Record<string, unknown>,
    is_standard: t.is_standard,
  }))

  const { data: inserted, error } = await supabase
    .from('contract_templates')
    .insert(rows)
    .select('id, template_id, name, jurisdiction, version, packs_enabled, is_standard, generator_schema, created_at')

  if (error) {
    console.error('Error inserting standard templates:', error)
    return []
  }

  return inserted ?? []
}
