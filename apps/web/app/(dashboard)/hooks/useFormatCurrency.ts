'use client'

import { useCurrency } from './useCurrency'
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol } from '../schedule/week/utils/currency-formatting'
import { SupportedCurrency } from '@/lib/currency/utils'

export function useFormatCurrency() {
  const { currency } = useCurrency()
  
  const format = (amount: number | null, decimals: number = 2) => {
    return formatCurrencyUtil(amount, currency, decimals)
  }
  
  const symbol = getCurrencySymbol(currency)
  
  return {
    format,
    symbol,
    currency
  }
}

