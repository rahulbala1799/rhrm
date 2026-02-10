import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { buildContractHtml, normalizeGenerationInput, type GenerationInput } from '@/lib/contracts/generate'

const BUCKET = 'compliance-documents'
const CONTRACTS_PREFIX = 'contracts'

/**
 * GET /api/contracts/assignments
 * List contract assignments. Query: ?staff_id=... to filter by employee.
 */
export async function GET(request: Request) {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const staffId = searchParams.get('staff_id')

  const supabase = await createClient()

  let q = supabase
    .from('contract_assignments')
    .select(`
      id,
      staff_id,
      template_id,
      template_version,
      status,
      created_at,
      issued_at,
      uploaded_at,
      admin_verified_at,
      contract_templates ( id, name, template_id ),
      staff ( id, first_name, last_name, email )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (staffId) {
    q = q.eq('staff_id', staffId)
  }

  const { data, error } = await q

  if (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
  }

  return NextResponse.json({ assignments: data ?? [] })
}

/**
 * POST /api/contracts/assignments
 * Create a contract assignment: merge defaults + input, generate HTML, store and issue.
 * Body: { template_id (UUID), staff_id, generation_input (object) }
 */
export async function POST(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { template_id: templateId, staff_id: staffId, generation_input: rawInput } = body

  if (!templateId || !staffId) {
    return NextResponse.json({ error: 'template_id and staff_id required' }, { status: 400 })
  }

  const supabase = await createClient()

  const template = await supabase
    .from('contract_templates')
    .select('id, version, packs_enabled')
    .eq('id', templateId)
    .eq('tenant_id', tenantId)
    .single()

  if (template.error || !template.data) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const staff = await supabase
    .from('staff')
    .select('id, first_name, last_name, email')
    .eq('id', staffId)
    .eq('tenant_id', tenantId)
    .single()

  if (staff.error || !staff.data) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  }

  const tenant = await supabase
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .single()

  const defaultsRow = await supabase
    .from('company_contract_defaults')
    .select('defaults_json')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const defaults = (defaultsRow.data?.defaults_json as Record<string, unknown>) ?? {}
  const mergedInput = { ...defaults, ...(typeof rawInput === 'object' ? rawInput : {}) }

  if (!mergedInput.employee?.full_name) {
    mergedInput.employee = {
      ...(mergedInput.employee as object),
      full_name: [staff.data.first_name, staff.data.last_name].filter(Boolean).join(' '),
      address: (mergedInput.employee as Record<string, string>)?.address ?? '',
    }
  }
  if (!mergedInput.employer?.legal_name && tenant.data?.name) {
    mergedInput.employer = {
      ...(mergedInput.employer as object),
      legal_name: tenant.data.name,
      registered_address: (mergedInput.employer as Record<string, string>)?.registered_address ?? '',
    }
  }

  const generationInput = normalizeGenerationInput(mergedInput)

  const packsEnabled = (template.data.packs_enabled as string[]) ?? []
  const clauseKeysOrder: string[] = []
  for (const packKey of packsEnabled) {
    const pack = await supabase
      .from('contract_packs')
      .select('clause_keys')
      .eq('pack_key', packKey)
      .eq('jurisdiction', 'IE')
      .single()
    if (pack.data?.clause_keys) {
      clauseKeysOrder.push(...(pack.data.clause_keys as string[]))
    }
  }

  const uniqueOrder = Array.from(new Set(clauseKeysOrder))
  const clauses = await supabase
    .from('contract_clauses')
    .select('clause_key, body')
    .eq('jurisdiction', 'IE')
    .eq('version', '1')
    .in('clause_key', uniqueOrder.length ? uniqueOrder : ['statutory_override_ie'])

  const clauseMap = new Map((clauses.data ?? []).map((c) => [c.clause_key, c.body]))
  const orderedBodies = uniqueOrder.map((k) => clauseMap.get(k)).filter(Boolean) as string[]

  const html = buildContractHtml(orderedBodies, generationInput as GenerationInput)

  const assignmentId = crypto.randomUUID()
  const storagePath = `${CONTRACTS_PREFIX}/${tenantId}/${assignmentId}/generated.html`

  const uploadResult = await supabase.storage.from(BUCKET).upload(storagePath, new Blob([html], { type: 'text/html' }), {
    contentType: 'text/html',
    upsert: true,
  })

  if (uploadResult.error) {
    console.error('Storage upload error:', uploadResult.error)
    return NextResponse.json({ error: 'Failed to store generated contract' }, { status: 500 })
  }

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  const { data: assignment, error } = await supabase
    .from('contract_assignments')
    .insert({
      id: assignmentId,
      tenant_id: tenantId,
      staff_id: staffId,
      template_id: template.data.id,
      template_version: template.data.version,
      status: 'issued',
      generation_input_json: generationInput,
      rendered_output_storage_path: storagePath,
      issued_at: new Date().toISOString(),
      issued_by: userId,
      created_by: userId,
    })
    .select(`
      id,
      staff_id,
      template_id,
      template_version,
      status,
      issued_at,
      contract_templates ( id, name, template_id ),
      staff ( id, first_name, last_name, email )
    `)
    .single()

  if (error) {
    console.error('Error creating assignment:', error)
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
  }

  return NextResponse.json({ assignment }, { status: 201 })
}
