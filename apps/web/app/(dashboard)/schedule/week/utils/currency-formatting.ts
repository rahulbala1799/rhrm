import { SupportedCurrency, CURRENCY_CONFIGS } from '@/lib/currency/utils'

/**
 * Format amount as currency using tenant's currency setting
 * This function should be called from client components that have access to currency context
 * 
 * @param amount - Amount to format (can be null)
 * @param currency - Currency code (default: USD)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string or "N/A" if amount is null/invalid
 */
export function formatCurrency(
  amount: number | null,
  currency: SupportedCurrency = 'USD',
  decimals: number = 2
): string {
  if (amount === null || isNaN(amount)) {
    return 'N/A'
  }
  
  const config = CURRENCY_CONFIGS[currency]
  
  // Handle zero values: show currency symbol with 0.00
  if (amount === 0) {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(0)
  }
  
  // Format with proper locale and currency
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: SupportedCurrency = 'USD'): string {
  return CURRENCY_CONFIGS[currency].symbol
}

