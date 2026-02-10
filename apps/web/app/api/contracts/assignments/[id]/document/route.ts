import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

const BUCKET = 'compliance-documents'

/**
 * GET /api/contracts/assignments/[id]/document?type=generated|signed
 * Stream the generated HTML or signed file for the assignment.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = await getTenantContext()
  const { id } = await params

  if (!tenantId || !id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'generated'

  const supabase = await createClient()

  const { data: assignment, error } = await supabase
    .from('contract_assignments')
    .select('tenant_id, staff_id, rendered_output_storage_path, signed_upload_storage_path')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  const path = type === 'signed' ? assignment.signed_upload_storage_path : assignment.rendered_output_storage_path
  if (!path) {
    return NextResponse.json({ error: type === 'signed' ? 'Signed document not uploaded yet' : 'Document not found' }, { status: 404 })
  }

  const { data: file, error: downloadError } = await supabase.storage.from(BUCKET).download(path)

  if (downloadError || !file) {
    console.error('Download error:', downloadError)
    return NextResponse.json({ error: 'Failed to load document' }, { status: 500 })
  }

  const contentType = path.endsWith('.html') ? 'text/html' : path.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'
  return new NextResponse(file, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': type === 'signed' ? 'inline; filename="signed-contract.pdf"' : 'inline; filename="contract.html"',
    },
  })
}
