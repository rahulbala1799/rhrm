import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * POST /api/compliance/review/[id]/approve
 * Approve document (admin only)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch document to check status and get requirement
  const { data: document, error: fetchError } = await supabase
    .from('staff_compliance_documents')
    .select('*, tenant_compliance_requirements(*)')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (document.status !== 'submitted') {
    return NextResponse.json({ 
      error: `Cannot approve document with status: ${document.status}` 
    }, { status: 400 })
  }

  // Calculate new expires_at based on approval date
  let expiresAt: string | null = null
  if (document.tenant_compliance_requirements?.expires_in_months) {
    const now = new Date()
    const expiryDate = new Date(now.setMonth(now.getMonth() + document.tenant_compliance_requirements.expires_in_months))
    expiresAt = expiryDate.toISOString().split('T')[0] // YYYY-MM-DD
  }

  // Update document to approved
  const { data: updated, error: updateError } = await supabase
    .from('staff_compliance_documents')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      expires_at: expiresAt
    })
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (updateError) {
    console.error('Error approving document:', updateError)
    return NextResponse.json({ error: 'Failed to approve document' }, { status: 500 })
  }

  return NextResponse.json({ 
    document: updated,
    message: 'Document approved successfully'
  })
}


