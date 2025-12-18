import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

export async function GET() {
  const { tenantId } = await getTenantContext()
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const supabase = await createClient()
  
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()
  
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch pay period config' }, { status: 500 })
  }
  
  const config = tenant?.settings?.pay_period || {
    type: 'weekly',
    week_starts_on: 'monday'
  }
  
  return NextResponse.json({ config })
}

export async function PUT(request: Request) {
  const { tenantId, role } = await getTenantContext()
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Only admin and superadmin can update
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const body = await request.json()
  const { config } = body
  
  // Validate config
  if (!config || !config.type) {
    return NextResponse.json({ error: 'Invalid config' }, { status: 400 })
  }
  
  const validTypes = ['weekly', 'fortnightly', 'semi-monthly', 'monthly', 'custom']
  if (!validTypes.includes(config.type)) {
    return NextResponse.json({ error: 'Invalid pay period type' }, { status: 400 })
  }
  
  const supabase = await createClient()
  
  // Get current settings
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()
  
  // Merge pay_period config
  const updatedSettings = {
    ...(tenant?.settings || {}),
    pay_period: config
  }
  
  const { error } = await supabase
    .from('tenants')
    .update({ settings: updatedSettings })
    .eq('id', tenantId)
  
  if (error) {
    return NextResponse.json({ error: 'Failed to update pay period config' }, { status: 500 })
  }
  
  return NextResponse.json({ config })
}

