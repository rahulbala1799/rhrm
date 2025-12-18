import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { getTenantCurrency } from '@/lib/currency/utils'
import { SupportedCurrency } from '@/lib/currency/types'

/**
 * GET /api/settings/currency
 * Get tenant currency setting
 */
export async function GET() {
  const { tenantId } = await getTenantContext()
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const currency = await getTenantCurrency()
    return NextResponse.json({ currency })
  } catch (error: any) {
    console.error('Error fetching currency:', error)
    return NextResponse.json(
      { error: 'Failed to fetch currency' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/currency
 * Update tenant currency setting
 */
export async function PUT(request: Request) {
  const { tenantId, role } = await getTenantContext()
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Only admin and superadmin can update currency
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const body = await request.json()
  const { currency } = body
  
  // Validate currency
  const validCurrencies: SupportedCurrency[] = ['USD', 'EUR', 'GBP']
  if (!validCurrencies.includes(currency)) {
    return NextResponse.json(
      { error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}` },
      { status: 400 }
    )
  }
  
  const supabase = await createClient()
  
  // Get current settings
  const { data: current } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()
  
  // Merge currency into settings
  const updatedSettings = {
    ...(current?.settings || {}),
    currency
  }
  
  // Update tenant
  const { data: tenant, error } = await supabase
    .from('tenants')
    .update({ settings: updatedSettings })
    .eq('id', tenantId)
    .select('id, settings')
    .single()
  
  if (error) {
    console.error('Error updating currency:', error)
    return NextResponse.json(
      { error: 'Failed to update currency' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ currency, tenant })
}

