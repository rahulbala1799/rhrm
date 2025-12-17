import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { computeDocumentStatus } from '@/lib/compliance/types'

/**
 * GET /api/compliance/documents
 * Get staff's applicable requirements + their uploaded documents
 */
export async function GET() {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's staff record to determine location
  const { data: staffRecord } = await supabase
    .from('staff')
    .select('location_id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .single()

  // Get tenant settings to determine country
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  const country = tenant?.settings?.country || 'UK' // Default to UK

  // Get all enabled requirements for this country
  // Filter by role and location applicability
  const { data: allRequirements } = await supabase
    .from('tenant_compliance_requirements')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('country_code', country)
    .eq('is_enabled', true)
    .order('sort_order', { ascending: true })

  // Filter requirements by applicability (role/location)
  const requirements = (allRequirements || []).filter(req => {
    if (req.applies_to_all) return true
    
    // Check role match
    if (req.role_ids && req.role_ids.includes(role)) return true
    
    // Check location match
    if (req.location_ids && staffRecord?.location_id && req.location_ids.includes(staffRecord.location_id)) return true
    
    return false
  })

  // Get user's documents
  const { data: documents } = await supabase
    .from('staff_compliance_documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)

  // Join requirements with documents
  const requirementsWithDocuments = requirements.map(req => {
    const doc = documents?.find(d => d.doc_type === req.doc_type)
    
    return {
      requirement: req,
      document: doc || null,
      computedStatus: computeDocumentStatus(doc || null)
    }
  })

  return NextResponse.json({ requirements: requirementsWithDocuments })
}

