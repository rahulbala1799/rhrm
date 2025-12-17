import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/staff/[id]/documents
 * Get compliance documents for a staff member
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Verify staff belongs to tenant
  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const documentType = searchParams.get('document_type')
  const status = searchParams.get('status')

  let query = supabase
    .from('compliance_documents')
    .select('*')
    .eq('staff_id', params.id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (documentType) {
    query = query.eq('document_type', documentType)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data: documents, error } = await query

  if (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }

  return NextResponse.json({ documents: documents || [] })
}

/**
 * POST /api/staff/[id]/documents
 * Create a compliance document for a staff member
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can create documents
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  // Verify staff belongs to tenant
  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  const body = await request.json()
  const {
    document_type,
    document_name,
    file_path,
    expiry_date,
    status,
  } = body

  // Validate required fields
  if (!document_type || !document_name || !file_path) {
    return NextResponse.json(
      { error: 'Document type, name, and file path are required' },
      { status: 400 }
    )
  }

  // Validate document_type
  const validTypes = ['right_to_work', 'training_cert', 'dbs_check', 'other']
  if (!validTypes.includes(document_type)) {
    return NextResponse.json(
      { error: 'Invalid document type' },
      { status: 400 }
    )
  }

  const { data: document, error } = await supabase
    .from('compliance_documents')
    .insert({
      tenant_id: tenantId,
      staff_id: params.id,
      document_type,
      document_name,
      file_path,
      expiry_date: expiry_date || null,
      status: status || 'pending',
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }

  return NextResponse.json({ document }, { status: 201 })
}


