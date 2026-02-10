import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

const BUCKET = 'compliance-documents'
const CONTRACTS_PREFIX = 'contracts'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

/**
 * POST /api/contracts/assignments/[id]/upload-signed
 * Upload signed contract file (PDF or image). Staff can upload for own assignment.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = await getTenantContext()
  const { id } = await params

  if (!tenantId || !id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from('contract_assignments')
    .select('id, staff_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!assignment?.data) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  const { data: user } = await supabase.auth.getUser()
  const userId = user?.data?.user?.id

  const staffRow = await supabase
    .from('staff')
    .select('user_id')
    .eq('id', assignment.data.staff_id)
    .single()

  const isOwn = staffRow.data?.user_id === userId
  const isAdminOrManager = await supabase
    .from('memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
    .then((r) => r.data?.role === 'admin' || r.data?.role === 'manager')

  if (!isOwn && !isAdminOrManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'File required' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Allowed: PDF, JPEG, PNG, WebP' }, { status: 400 })
  }

  const ext = file.type === 'application/pdf' ? 'pdf' : file.name.split('.').pop() || 'bin'
  const storagePath = `${CONTRACTS_PREFIX}/${tenantId}/${id}/signed.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('contract_assignments')
    .update({
      signed_upload_storage_path: storagePath,
      status: 'uploaded',
      uploaded_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (updateError) {
    console.error('Update error:', updateError)
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
  }

  return NextResponse.json({ assignment: updated })
}
