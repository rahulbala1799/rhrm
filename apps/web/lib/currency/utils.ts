import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { SupportedCurrency } from './types'

/**
 * Get tenant currency from database
 * Returns USD as default if not set
 */
export async function getTenantCurrency(): Promise<SupportedCurrency> {
  const { tenantId } = await getTenantContext()
  if (!tenantId) return 'USD'
  
  const supabase = await createClient()
  const { data } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()
  
  const currency = data?.settings?.currency as SupportedCurrency | undefined
  return currency && ['USD', 'EUR', 'GBP'].includes(currency) 
    ? currency 
    : 'USD'
}


