import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const staffId = params.id
  const supabase = await createClient()
  
  // Verify staff belongs to tenant
  const { data: staff } = await supabase
    .from('staff')
    .select('id, tenant_id')
    .eq('id', staffId)
    .eq('tenant_id', tenantId)
    .single()
  
  if (!staff) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  }
  
  // 🚨 PERMISSION: Only Admin/Superadmin can view rate history
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Fetch rate history
  const { data: history, error } = await supabase
    .from('staff_hourly_rates')
    .select('id, hourly_rate, effective_date, notes, created_at, created_by')
    .eq('staff_id', staffId)
    .order('effective_date', { ascending: false })
  
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch rate history' }, { status: 500 })
  }
  
  return NextResponse.json({ history: history || [] })
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { tenantId, role } = await getTenantContext()
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 🚨 PERMISSION: Only Admin/Superadmin can modify rate history
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const staffId = params.id
  const body = await request.json()
  const { hourly_rate, effective_date, notes } = body
  
  // Validate
  if (!hourly_rate || hourly_rate < 0) {
    return NextResponse.json({ error: 'Invalid hourly rate' }, { status: 400 })
  }
  
  if (!effective_date) {
    return NextResponse.json({ error: 'Effective date required' }, { status: 400 })
  }
  
  const supabase = await createClient()
  
  // Verify staff belongs to tenant
  const { data: staff } = await supabase
    .from('staff')
    .select('id, tenant_id')
    .eq('id', staffId)
    .eq('tenant_id', tenantId)
    .single()
  
  if (!staff) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  }
  
  // Check for duplicate effective_date
  const { data: existing } = await supabase
    .from('staff_hourly_rates')
    .select('id')
    .eq('staff_id', staffId)
    .eq('effective_date', effective_date)
    .single()
  
  if (existing) {
    return NextResponse.json(
      { error: 'Rate already exists for this effective date' },
      { status: 409 }
    )
  }
  
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  // Insert rate
  const { data: rate, error: insertError } = await supabase
    .from('staff_hourly_rates')
    .insert({
      staff_id: staffId,
      tenant_id: tenantId,
      hourly_rate,
      effective_date,
      notes: notes || null,
      created_by: user?.id || null
    })
    .select()
    .single()
  
  if (insertError) {
    // Handle unique constraint violation
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'A rate already exists for this effective date' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Failed to create rate' }, { status: 500 })
  }
  
  return NextResponse.json({ rate })
}

