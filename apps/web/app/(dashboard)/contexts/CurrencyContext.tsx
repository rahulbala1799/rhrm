'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { SupportedCurrency } from '@/lib/currency/types'

interface CurrencyContextType {
  currency: SupportedCurrency
  loading: boolean
  error: string | null
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  loading: true,
  error: null,
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<SupportedCurrency>('USD')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/settings/currency')
        
        if (!response.ok) {
          // Default to USD on error
          setCurrency('USD')
          setLoading(false)
          return
        }
        
        const data = await response.json()
        setCurrency(data.currency || 'USD')
      } catch (err: any) {
        console.error('Error fetching currency:', err)
        setError(err.message)
        setCurrency('USD') // Default fallback
      } finally {
        setLoading(false)
      }
    }
    
    fetchCurrency()
  }, [])

  return (
    <CurrencyContext.Provider value={{ currency, loading, error }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrencyContext() {
  return useContext(CurrencyContext)
}

