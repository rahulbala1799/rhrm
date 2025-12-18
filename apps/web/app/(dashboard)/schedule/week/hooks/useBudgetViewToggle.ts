'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Hook for managing budget view toggle state with localStorage persistence
 * @returns Tuple of [isActive, toggle function]
 */
export function useBudgetViewToggle(): [boolean, (active: boolean) => void] {
  const [budgetViewActive, setBudgetViewActive] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('weekPlanner_budgetViewActive')
      return saved === 'true'
    }
    return false
  })

  const handleToggle = useCallback((active: boolean) => {
    setBudgetViewActive(active)
    
    // Track analytics event (multiple providers supported)
    if (typeof window !== 'undefined') {
      // Google Analytics
      if ((window as any).gtag) {
        ;(window as any).gtag('event', 'budget_view_toggle', {
          active,
          source: 'planner'
        })
      }
      // Plausible Analytics
      if ((window as any).plausible) {
        ;(window as any).plausible('budget_view_toggle', { props: { active } })
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('weekPlanner_budgetViewActive', String(budgetViewActive))
    }
  }, [budgetViewActive])

  return [budgetViewActive, handleToggle]
}

