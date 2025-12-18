'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Shift } from '@/lib/schedule/types'
import { ShiftUpdateError } from '@/lib/schedule/types'
import { useWeekShiftsSWR } from './useWeekShiftsSWR'
import { useTenantId } from '../../hooks/useTenantId'
import { prefetchAdjacentWeeks, cancelPrefetch } from '../../hooks/usePrefetch'
import { updateShiftViaAPI, createShiftViaAPI, deleteShiftViaAPI } from '@/lib/schedule/shift-updates'
import { mutate } from 'swr'
import { getWeekCacheKey, CacheFilters } from '../../hooks/useScheduleCache'

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

interface OptimisticShift extends Shift {
  _tempId?: string
  _isOptimistic?: boolean
}

interface PendingMutation {
  shiftId: string
  type: 'create' | 'update' | 'delete' | 'move'
  optimisticShift?: OptimisticShift
  originalShift?: Shift
}

export function useOptimisticShifts(
  weekStart: Date,
  filters?: {
    locationId?: string
    staffId?: string
    status?: string
    includeCancelled?: boolean
  }
) {
  const tenantId = useTenantId()
  const cacheFilters: CacheFilters | undefined = filters ? {
    locationId: filters.locationId,
    staffId: filters.staffId,
    status: filters.status,
    includeCancelled: filters.includeCancelled,
  } : undefined

  const { shifts, weekEnd, loading, error, conflicts, refetch } = useWeekShiftsSWR(
    weekStart,
    tenantId,
    cacheFilters
  )
  
  const [optimisticShifts, setOptimisticShifts] = useState<OptimisticShift[]>([])
  const [syncing, setSyncing] = useState(false)
  const pendingMutationsRef = useRef<Map<string, PendingMutation>>(new Map())

  // Prefetch adjacent weeks on idle
  useEffect(() => {
    if (!tenantId) return
    
    const prefetch = async () => {
      await prefetchAdjacentWeeks(
        weekStart,
        tenantId,
        cacheFilters,
        async (targetWeekStart) => {
          // Prefetch function - fetch and cache the data
          const weekStartStr = targetWeekStart.toISOString().split('T')[0]
          const params = new URLSearchParams()
          params.append('weekStart', weekStartStr)
          if (cacheFilters?.locationId) params.append('locationId', cacheFilters.locationId)
          if (cacheFilters?.staffId) params.append('staffId', cacheFilters.staffId)
          if (cacheFilters?.status) params.append('status', cacheFilters.status)
          if (cacheFilters?.includeCancelled) params.append('includeCancelled', 'true')
          
          const response = await fetch(`/api/schedule/week?${params}`)
          if (response.ok) {
            const data = await response.json()
            const key = getWeekCacheKey(tenantId, targetWeekStart, cacheFilters)
            mutate(key, data, false) // Cache without revalidation
          }
        }
      )
    }
    
    prefetch()
    
    return () => {
      cancelPrefetch()
    }
  }, [weekStart, tenantId, cacheFilters])

  // Merge real shifts with optimistic shifts
  const mergedShifts = useCallback((): Shift[] => {
    const realShiftsMap = new Map<string, Shift>()
    const optimisticShiftsMap = new Map<string, OptimisticShift>()

    // Add real shifts
    for (const shift of shifts) {
      realShiftsMap.set(shift.id, shift)
    }

    // Add optimistic shifts (overwrite real shifts if mutation is pending)
    for (const optimisticShift of optimisticShifts) {
      const key = optimisticShift._tempId || optimisticShift.id
      // Don't overwrite if mutation is still pending
      if (!pendingMutationsRef.current.has(key)) {
        optimisticShiftsMap.set(key, optimisticShift)
      }
    }

    // Merge: optimistic takes precedence for pending mutations
    const merged = new Map<string, Shift>()
    
    // Add all real shifts first
    Array.from(realShiftsMap.entries()).forEach(([id, shift]) => {
      if (!pendingMutationsRef.current.has(id)) {
        merged.set(id, shift)
      }
    })

    // Add optimistic shifts (overwrite real if exists)
    Array.from(optimisticShiftsMap.entries()).forEach(([key, optimisticShift]) => {
      const shift = optimisticShift as Shift
      merged.set(shift.id, shift)
    })

    return Array.from(merged.values())
  }, [shifts, optimisticShifts])

  const createShift = useCallback(async (shiftData: Partial<Shift>): Promise<Shift> => {
    const tempId = generateTempId()
    const optimisticShift: OptimisticShift = {
      id: tempId,
      staff_id: shiftData.staff_id!,
      location_id: shiftData.location_id!,
      role_id: shiftData.role_id || null,
      start_time: shiftData.start_time!,
      end_time: shiftData.end_time!,
      break_duration_minutes: shiftData.break_duration_minutes || 0,
      status: shiftData.status || 'draft',
      notes: shiftData.notes || null,
      staff: shiftData.staff || null,
      location: shiftData.location || null,
      role: shiftData.role || null,
      _tempId: tempId,
      _isOptimistic: true,
    }

    // Add to optimistic state immediately
    setOptimisticShifts((prev) => [...prev, optimisticShift])
    setSyncing(true)

    const mutation: PendingMutation = {
      shiftId: tempId,
      type: 'create',
      optimisticShift,
    }
    pendingMutationsRef.current.set(tempId, mutation)

    try {
      // Use shared utility
      const realShift = await createShiftViaAPI({
        staff_id: shiftData.staff_id,
        location_id: shiftData.location_id,
        role_id: shiftData.role_id || null,
        start_time: shiftData.start_time,
        end_time: shiftData.end_time,
        break_duration_minutes: shiftData.break_duration_minutes || 0,
        status: shiftData.status || 'draft',
        notes: shiftData.notes || null,
      })

      // Reconcile: replace temp shift with real shift
      setOptimisticShifts((prev) => {
        const filtered = prev.filter((s) => s._tempId !== tempId)
        // Match by staff_id, location_id, start_time, end_time (within ±1 second)
        const match = prev.find(
          (s) =>
            s._tempId === tempId &&
            s.staff_id === realShift.staff_id &&
            s.location_id === realShift.location_id &&
            Math.abs(new Date(s.start_time).getTime() - new Date(realShift.start_time).getTime()) < 1000 &&
            Math.abs(new Date(s.end_time).getTime() - new Date(realShift.end_time).getTime()) < 1000
        )
        
        if (match) {
          // Replace with real shift (same position, no flicker)
          return filtered.map((s) => (s._tempId === tempId ? realShift : s))
        } else {
          // Reconciliation failed: remove temp, add real (accept small flicker)
          return [...filtered, realShift]
        }
      })

      pendingMutationsRef.current.delete(tempId)
      
      // Invalidate cache and refetch in background (silent)
      if (tenantId) {
        const key = getWeekCacheKey(tenantId, weekStart, cacheFilters)
        mutate(key, undefined, { revalidate: true })
      }
      
      return realShift
    } catch (err) {
      // Revert optimistic update
      setOptimisticShifts((prev) => prev.filter((s) => s._tempId !== tempId))
      pendingMutationsRef.current.delete(tempId)
      setSyncing(false)
      // Re-throw ShiftUpdateError
      throw err
    } finally {
      setSyncing(false)
    }
  }, [weekStart, tenantId, cacheFilters])

  const updateShift = useCallback(async (shiftId: string, updates: Partial<Shift>): Promise<Shift> => {
    const originalShift = shifts.find((s) => s.id === shiftId)
    if (!originalShift) {
      throw new Error('Shift not found')
    }

    const optimisticShift: OptimisticShift = {
      ...originalShift,
      ...updates,
      _isOptimistic: true,
    }

    // Update optimistic state immediately
    setOptimisticShifts((prev) => {
      const filtered = prev.filter((s) => s.id !== shiftId && s._tempId !== shiftId)
      return [...filtered, optimisticShift]
    })
    setSyncing(true)

    const mutation: PendingMutation = {
      shiftId,
      type: 'update',
      optimisticShift,
      originalShift,
    }
    pendingMutationsRef.current.set(shiftId, mutation)

    try {
      // Use shared utility
      const realShift = await updateShiftViaAPI(shiftId, updates)

      // Replace optimistic with real
      setOptimisticShifts((prev) => {
        const filtered = prev.filter((s) => s.id !== shiftId)
        return [...filtered, realShift]
      })

      pendingMutationsRef.current.delete(shiftId)
      
      // Invalidate cache and refetch in background (silent)
      if (tenantId) {
        const key = getWeekCacheKey(tenantId, weekStart, cacheFilters)
        mutate(key, undefined, { revalidate: true })
      }
      
      return realShift
    } catch (err) {
      // Revert optimistic update
      setOptimisticShifts((prev) => prev.filter((s) => s.id !== shiftId))
      pendingMutationsRef.current.delete(shiftId)
      setSyncing(false)
      // Re-throw ShiftUpdateError
      throw err
    } finally {
      setSyncing(false)
    }
  }, [shifts, weekStart, tenantId, cacheFilters])

  const deleteShift = useCallback(async (shiftId: string): Promise<void> => {
    const originalShift = shifts.find((s) => s.id === shiftId)
    if (!originalShift) {
      throw new Error('Shift not found')
    }

    // Remove from optimistic state immediately
    setOptimisticShifts((prev) => prev.filter((s) => s.id !== shiftId && s._tempId !== shiftId))
    setSyncing(true)

    const mutation: PendingMutation = {
      shiftId,
      type: 'delete',
      originalShift,
    }
    pendingMutationsRef.current.set(shiftId, mutation)

    try {
      // Use shared utility
      await deleteShiftViaAPI(shiftId)

      pendingMutationsRef.current.delete(shiftId)
      
      // Invalidate cache and refetch in background (silent)
      if (tenantId) {
        const key = getWeekCacheKey(tenantId, weekStart, cacheFilters)
        mutate(key, undefined, { revalidate: true })
      }
    } catch (err) {
      // Revert: add back original shift
      if (originalShift) {
        setOptimisticShifts((prev) => [...prev, originalShift as OptimisticShift])
      }
      pendingMutationsRef.current.delete(shiftId)
      setSyncing(false)
      // Re-throw ShiftUpdateError
      throw err
    } finally {
      setSyncing(false)
    }
  }, [shifts, weekStart, tenantId, cacheFilters])

  const moveShift = useCallback(async (
    shiftId: string,
    targetStaffId: string,
    targetDayIndex: number,
    targetDate: Date,
    timezone: string
  ): Promise<Shift> => {
    // This will be implemented with drag/drop logic
    // For now, delegate to updateShift
    return updateShift(shiftId, {
      staff_id: targetStaffId,
      // start_time and end_time will be computed from targetDate + preserved clock times
    } as Partial<Shift>)
  }, [updateShift])

  return {
    shifts: mergedShifts(),
    weekEnd,
    loading,
    error,
    syncing,
    conflicts,
    createShift,
    updateShift,
    deleteShift,
    moveShift,
    refetch,
  }
}

