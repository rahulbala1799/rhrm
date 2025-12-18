'use client'

import { useState, useEffect, useCallback } from 'react'

interface OnboardingProgress {
  version: number
  currentStep: number
  completedSteps: number[]
  data: Record<string, any>
  skippedSteps: number[]
  idempotencyKey: string
  startedAt: string
  lastUpdatedAt: string
  sessionId?: string
  expiresAt?: string
}

interface UseOnboardingProgressReturn {
  progress: OnboardingProgress | null
  loading: boolean
  error: string | null
  sessionId: string | null
  idempotencyKey: string | null
  saveProgress: (step: number, data: Record<string, any>, skippedSteps?: number[]) => Promise<boolean>
  initializeSession: () => Promise<void>
  versionMismatch: boolean
  expired: boolean
}

export function useOnboardingProgress(): UseOnboardingProgressReturn {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)
  const [versionMismatch, setVersionMismatch] = useState(false)
  const [expired, setExpired] = useState(false)

  // Initialize session on first visit
  const initializeSession = useCallback(async () => {
    try {
      const response = await fetch('/api/onboarding/start', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to initialize onboarding session')
      }

      const { sessionId: newSessionId, idempotencyKey: newIdempotencyKey } = await response.json()
      setSessionId(newSessionId)
      setIdempotencyKey(newIdempotencyKey)
    } catch (err: any) {
      console.error('Error initializing session:', err)
      setError(err.message)
    }
  }, [])

  // Load progress from server
  const loadProgress = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/onboarding/progress')

      if (!response.ok) {
        throw new Error('Failed to load progress')
      }

      const result = await response.json()

      if (result.expired) {
        setExpired(true)
        setProgress(null)
        return
      }

      if (result.versionMismatch) {
        setVersionMismatch(true)
        setProgress(result.progress)
        return
      }

      if (result.progress) {
        setProgress(result.progress)
        setSessionId(result.progress.sessionId || null)
        setIdempotencyKey(result.progress.idempotencyKey || null)
      }
    } catch (err: any) {
      console.error('Error loading progress:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Save progress to server
  const saveProgress = useCallback(
    async (
      step: number,
      data: Record<string, any>,
      skippedSteps: number[] = []
    ): Promise<boolean> => {
      if (!sessionId) {
        console.error('No session ID available')
        return false
      }

      try {
        const response = await fetch('/api/onboarding/progress', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentStep: step,
            data,
            sessionId,
            skippedSteps,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          
          // Handle session ID mismatch
          if (response.status === 409 && errorData.conflict) {
            setError(errorData.error)
            return false
          }

          // Never block navigation - return false but allow user to continue
          console.error('Failed to save progress:', errorData)
          return false
        }

        const result = await response.json()
        if (result.progress) {
          setProgress(result.progress)
        }

        return result.saved !== false
      } catch (err: any) {
        console.error('Error saving progress:', err)
        // Never block navigation - return false but allow user to continue
        return false
      }
    },
    [sessionId]
  )

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  return {
    progress,
    loading,
    error,
    sessionId,
    idempotencyKey,
    saveProgress,
    initializeSession,
    versionMismatch,
    expired,
  }
}




