/**
 * Window focus refetch hook
 * 
 * Rate-limited refetch on window focus (>=30s minimum interval)
 */

'use client'

import { useEffect, useRef } from 'react'

const MIN_REFETCH_INTERVAL_MS = 30000 // 30 seconds

export function useWindowFocusRefetch(refetch: () => void) {
  const lastRefetchRef = useRef<number>(0)

  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now()
      const timeSinceLastRefetch = now - lastRefetchRef.current

      if (timeSinceLastRefetch >= MIN_REFETCH_INTERVAL_MS) {
        lastRefetchRef.current = now
        refetch()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetch])
}

