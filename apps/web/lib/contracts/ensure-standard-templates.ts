import type { SupabaseClient } from '@supabase/supabase-js'
import { STANDARD_IE_TEMPLATES } from './standard-templates'

/**
 * Ensure standard IE templates exist for the tenant. Returns the list of newly inserted templates.
 */
export async function ensureStandardTemplates(supabase: SupabaseClient, tenantId: string) {
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
