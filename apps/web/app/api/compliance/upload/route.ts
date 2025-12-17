import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * POST /api/compliance/upload
 * Upload file and/or submit reference data
 */
export async function POST(request: Request) {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const requirementId = formData.get('requirementId') as string
    const docType = formData.get('docType') as string
    const referenceNumber = formData.get('referenceNumber') as string | null
    const checkedDate = formData.get('checkedDate') as string | null

    if (!requirementId || !docType) {
      return NextResponse.json({ error: 'requirementId and docType are required' }, { status: 400 })
    }

    // Fetch requirement to get collection_method and expires_in_months
    const { data: requirement } = await supabase
      .from('tenant_compliance_requirements')
      .select('*')
      .eq('id', requirementId)
      .eq('tenant_id', tenantId)
      .single()

    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 })
    }

    // Validate submission matches collection_method
    const hasFile = file !== null
    const hasReference = referenceNumber !== null

    if (requirement.collection_method === 'upload' && !hasFile) {
      return NextResponse.json({ error: 'File required for this document type' }, { status: 400 })
    }

    if (requirement.collection_method === 'reference' && hasFile) {
      return NextResponse.json({ error: 'File not allowed for reference-only document' }, { status: 400 })
    }

    if (requirement.collection_method === 'reference' && !hasReference) {
      return NextResponse.json({ error: 'Reference number required' }, { status: 400 })
    }

    if (requirement.collection_method === 'both' && !hasFile) {
      return NextResponse.json({ error: 'File required (reference optional)' }, { status: 400 })
    }

    // Validate file if provided
    if (hasFile) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 413 })
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, JPG, PNG, WEBP' }, { status: 400 })
      }
    }

    // Check if replacing existing document
    const { data: existing } = await supabase
      .from('staff_compliance_documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .eq('doc_type', docType)
      .single()

    // Delete old file if exists and has storage_path
    if (existing && existing.storage_path) {
      await supabase.storage
        .from('compliance-documents')
        .remove([existing.storage_path])
    }

    // Delete old database row if exists
    if (existing) {
      await supabase
        .from('staff_compliance_documents')
        .delete()
        .eq('id', existing.id)
    }

    let storagePath: string | null = null
    let fileName: string | null = null
    let fileMime: string | null = null
    let fileSize: number | null = null

    // Upload file if provided
    if (hasFile) {
      const now = new Date()
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const fileExt = file.name.split('.').pop() || 'pdf'
      const uniqueId = crypto.randomUUID()
      
      storagePath = `${tenantId}/${user.id}/${docType}/${yearMonth}/${uniqueId}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('compliance-documents')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
      }

      fileName = file.name
      fileMime = file.type
      fileSize = file.size
    }

    // Calculate expires_at
    let expiresAt: string | null = null
    if (requirement.expires_in_months) {
      const now = new Date()
      const expiryDate = new Date(now.setMonth(now.getMonth() + requirement.expires_in_months))
      expiresAt = expiryDate.toISOString().split('T')[0] // YYYY-MM-DD
    }

    // Insert new document record
    const { data: document, error: insertError } = await supabase
      .from('staff_compliance_documents')
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
        requirement_id: requirementId,
        doc_type: docType,
        status: 'submitted',
        storage_bucket: 'compliance-documents',
        storage_path: storagePath,
        file_name: fileName,
        file_mime: fileMime,
        file_size: fileSize,
        reference_number: referenceNumber,
        checked_date: checkedDate,
        expires_at: expiresAt,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      
      // Clean up uploaded file if DB insert failed
      if (storagePath) {
        await supabase.storage
          .from('compliance-documents')
          .remove([storagePath])
      }
      
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 })
    }

    return NextResponse.json({ 
      document,
      message: 'Document submitted successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 })
  }
}

