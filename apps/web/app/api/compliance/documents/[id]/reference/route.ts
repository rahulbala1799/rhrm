import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * PATCH /api/compliance/documents/[id]/reference
 * Update reference metadata only (staff correction for typos)
 * Uses anon key + narrow RLS policy (no service role)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { reference_number, checked_date } = body

  // At least one field must be provided
  if (reference_number === undefined && checked_date === undefined) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createClient()

  // Build update object with ONLY reference fields
  const updates: any = {}
  if (reference_number !== undefined) updates.reference_number = reference_number
  if (checked_date !== undefined) updates.checked_date = checked_date

  // Execute UPDATE via Supabase client (anon key + auth session)
  // RLS policy enforces: own document, status='submitted', active membership
  const { data: document, error } = await supabase
    .from('staff_compliance_documents')
    .update(updates)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) {
    console.error('Error updating reference metadata:', error)
    
    // RLS will block if status != 'submitted' or not own document
    if (error.code === 'PGRST116' || !document) {
      return NextResponse.json({ 
        error: 'Cannot update: document not found, already reviewed, or not yours' 
      }, { status: 403 })
    }
    
    return NextResponse.json({ error: 'Failed to update reference metadata' }, { status: 500 })
  }

  return NextResponse.json({ 
    document: {
      id: document.id,
      reference_number: document.reference_number,
      checked_date: document.checked_date
    },
    message: 'Reference metadata updated successfully'
  })
}



