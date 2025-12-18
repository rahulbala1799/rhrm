import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP'

export interface CurrencyConfig {
  code: SupportedCurrency
  symbol: string
  locale: string
  name: string
}

export const CURRENCY_CONFIGS: Record<SupportedCurrency, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
    name: 'US Dollar'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    locale: 'de-DE', // Using de-DE for Euro formatting (German locale is common for EUR)
    name: 'Euro'
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    locale: 'en-GB',
    name: 'British Pound'
  }
}

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

/**
 * Get currency configuration for a currency code
 */
export function getCurrencyConfig(currency: SupportedCurrency): CurrencyConfig {
  return CURRENCY_CONFIGS[currency]
}

