import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/compliance/documents/[id]/view
 * Generate signed URL for viewing/downloading file
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

  // Fetch document (RLS ensures own or admin)
  const { data: document, error } = await supabase
    .from('staff_compliance_documents')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Check if document has a file
  if (!document.storage_path) {
    return NextResponse.json({ 
      error: 'No file attached. This is a reference-only document.' 
    }, { status: 400 })
  }

  // Generate signed URL (valid for 1 hour)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('compliance-documents')
    .createSignedUrl(document.storage_path, 3600) // 1 hour = 3600 seconds

  if (signedError || !signedData) {
    console.error('Error creating signed URL:', signedError)
    return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 })
  }

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 1)

  return NextResponse.json({
    signedUrl: signedData.signedUrl,
    expiresAt: expiresAt.toISOString()
  })
}



