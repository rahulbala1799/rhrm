import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { ensureStandardTemplates } from '@/lib/contracts/ensure-standard-templates'

/**
 * POST /api/contracts/templates/ensure-standard
 * Ensure standard IE templates exist for the tenant (idempotent; skips if already present).
 */
export async function POST() {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const existing = await supabase
    .from('contract_templates')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)

  if (existing.data?.length) {
    const { data: templates } = await supabase
      .from('contract_templates')
      .select('id, template_id, name, jurisdiction, version, packs_enabled, is_standard, generator_schema, created_at')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })
    return NextResponse.json({ templates: templates ?? [], ensured: false })
  }

  const inserted = await ensureStandardTemplates(supabase, tenantId)
  return NextResponse.json({ templates: inserted, ensured: true })
}
