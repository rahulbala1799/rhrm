import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * PUT /api/staff/[id]/documents/[documentId]
 * Update a compliance document
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string; documentId: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can update documents
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const body = await request.json()
  const {
    document_type,
    document_name,
    file_path,
    expiry_date,
    status,
  } = body

  const updateData: any = {}
  if (document_type !== undefined) {
    const validTypes = ['right_to_work', 'training_cert', 'dbs_check', 'other']
    if (!validTypes.includes(document_type)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      )
    }
    updateData.document_type = document_type
  }
  if (document_name !== undefined) updateData.document_name = document_name
  if (file_path !== undefined) updateData.file_path = file_path
  if (expiry_date !== undefined) updateData.expiry_date = expiry_date
  if (status !== undefined) {
    updateData.status = status
    // If verifying, set verified_by and verified_at
    if (status === 'verified' && user) {
      updateData.verified_by = user.id
      updateData.verified_at = new Date().toISOString()
    }
  }

  const { data: document, error } = await supabase
    .from('compliance_documents')
    .update(updateData)
    .eq('id', params.documentId)
    .eq('staff_id', params.id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }

  return NextResponse.json({ document })
}

/**
 * DELETE /api/staff/[id]/documents/[documentId]
 * Delete a compliance document
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; documentId: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin can delete documents
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('compliance_documents')
    .delete()
    .eq('id', params.documentId)
    .eq('staff_id', params.id)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}


