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
 * Get currency configuration for a currency code
 * Client-safe function (no server-side dependencies)
 */
export function getCurrencyConfig(currency: SupportedCurrency): CurrencyConfig {
  return CURRENCY_CONFIGS[currency]
}

