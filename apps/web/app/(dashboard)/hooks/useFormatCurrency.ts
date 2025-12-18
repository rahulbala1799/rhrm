'use client'

import { useCurrency } from './useCurrency'
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol } from '../schedule/week/utils/currency-formatting'

export function useFormatCurrency() {
  const { currency, loading } = useCurrency()
  
  const format = (amount: number | null, decimals: number = 2) => {
    // Format with current currency (will update when currency loads)
    return formatCurrencyUtil(amount, currency, decimals)
  }
  
  const symbol = getCurrencySymbol(currency)
  
  return {
    format,
    symbol,
    currency,
    loading
  }
}

