import { SupportedCurrency, CURRENCY_CONFIGS } from '@/lib/currency/types'

/**
 * Format amount as currency with consistent symbol placement (symbol before number)
 * This ensures all currencies display as: €20.50, $20.50, £20.50
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
  
  // Format number with proper locale (for decimal separator, thousand separator)
  const numberFormatter = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  
  const formattedNumber = numberFormatter.format(amount)
  
  // Always place symbol before the number for consistency
  // Format: €20.50, $20.50, £20.50
  return `${config.symbol}${formattedNumber}`
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: SupportedCurrency = 'USD'): string {
  return CURRENCY_CONFIGS[currency].symbol
}

