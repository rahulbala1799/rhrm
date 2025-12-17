import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * POST /api/compliance/review/[id]/reject
 * Reject document (admin only)
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

  const body = await request.json()
  const { reason } = body

  if (!reason || reason.length < 10) {
    return NextResponse.json({ 
      error: 'Rejection reason is required (minimum 10 characters)' 
    }, { status: 400 })
  }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch document to check status
  const { data: document, error: fetchError } = await supabase
    .from('staff_compliance_documents')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (document.status !== 'submitted') {
    return NextResponse.json({ 
      error: `Cannot reject document with status: ${document.status}` 
    }, { status: 400 })
  }

  // Update document to rejected
  const { data: updated, error: updateError } = await supabase
    .from('staff_compliance_documents')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (updateError) {
    console.error('Error rejecting document:', updateError)
    return NextResponse.json({ error: 'Failed to reject document' }, { status: 500 })
  }

  return NextResponse.json({ 
    document: updated,
    message: 'Document rejected successfully'
  })
}

