'use client'

import { useState, useEffect } from 'react'
import { SupportedCurrency } from '@/lib/currency/types'

export function useCurrency() {
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
  
  return { currency, loading, error }
}

