/**
 * Offline detection hook
 * 
 * Detects when the app goes offline and shows a non-blocking indicator
 */

'use client'

import { useState, useEffect } from 'react'

export function useOfflineDetection() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
    }

    const handleOffline = () => {
      setIsOffline(true)
    }

    // Check initial state
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOffline }
}

