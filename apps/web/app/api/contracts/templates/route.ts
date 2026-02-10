import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { ensureStandardTemplates } from '@/lib/contracts/ensure-standard-templates'

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
