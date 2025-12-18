import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string, rateId: string } }
) {
  const { tenantId, role } = await getTenantContext()
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 🚨 PERMISSION: Only Admin/Superadmin can delete rate history
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const { rateId } = params
  const supabase = await createClient()
  
  // Get rate to check effective_date and tenant
  const { data: rate } = await supabase
    .from('staff_hourly_rates')
    .select('effective_date, staff_id, tenant_id')
    .eq('id', rateId)
    .single()
  
  if (!rate) {
    return NextResponse.json({ error: 'Rate not found' }, { status: 404 })
  }
  
  // Verify tenant
  if (rate.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Only allow deletion of future rates
  const today = new Date().toISOString().split('T')[0]
  if (rate.effective_date <= today) {
    return NextResponse.json(
      { error: 'Cannot delete historical rates' },
      { status: 400 }
    )
  }
  
  // Delete rate
  const { error } = await supabase
    .from('staff_hourly_rates')
    .delete()
    .eq('id', rateId)
  
  if (error) {
    return NextResponse.json({ error: 'Failed to delete rate' }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}

