'use client'

import { useState, useCallback, useRef } from 'react'
import { Shift, useWeekShifts } from './useWeekShifts'

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
  const { shifts, weekEnd, loading, error, conflicts, refetch } = useWeekShifts(weekStart, filters)
  const [optimisticShifts, setOptimisticShifts] = useState<OptimisticShift[]>([])
  const [syncing, setSyncing] = useState(false)
  const pendingMutationsRef = useRef<Map<string, PendingMutation>>(new Map())

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
      const response = await fetch('/api/schedule/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: shiftData.staff_id,
          location_id: shiftData.location_id,
          role_id: shiftData.role_id || null,
          start_time: shiftData.start_time,
          end_time: shiftData.end_time,
          break_duration_minutes: shiftData.break_duration_minutes || 0,
          status: shiftData.status || 'draft',
          notes: shiftData.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create shift')
      }

      const realShift: Shift = await response.json()

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
      
      // Refetch in background
      refetch()
      
      return realShift
    } catch (err: any) {
      // Revert optimistic update
      setOptimisticShifts((prev) => prev.filter((s) => s._tempId !== tempId))
      pendingMutationsRef.current.delete(tempId)
      setSyncing(false)
      throw err
    } finally {
      setSyncing(false)
    }
  }, [refetch])

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
      const response = await fetch(`/api/schedule/shifts/${shiftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 403) {
          throw new Error('Not allowed: you don\'t have permission.')
        }
        if (response.status === 409) {
          throw new Error(errorData.error || 'Shift not saved: overlaps another shift.')
        }
        throw new Error(errorData.error || 'Failed to update shift')
      }

      const realShift: Shift = await response.json()

      // Replace optimistic with real
      setOptimisticShifts((prev) => {
        const filtered = prev.filter((s) => s.id !== shiftId)
        return [...filtered, realShift]
      })

      pendingMutationsRef.current.delete(shiftId)
      
      // Refetch in background
      refetch()
      
      return realShift
    } catch (err: any) {
      // Revert optimistic update
      setOptimisticShifts((prev) => prev.filter((s) => s.id !== shiftId))
      pendingMutationsRef.current.delete(shiftId)
      setSyncing(false)
      throw err
    } finally {
      setSyncing(false)
    }
  }, [shifts, refetch])

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
      const response = await fetch(`/api/schedule/shifts/${shiftId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 403) {
          throw new Error('Not allowed: you don\'t have permission.')
        }
        throw new Error(errorData.error || 'Failed to delete shift')
      }

      pendingMutationsRef.current.delete(shiftId)
      
      // Refetch in background
      refetch()
    } catch (err: any) {
      // Revert: add back original shift
      if (originalShift) {
        setOptimisticShifts((prev) => [...prev, originalShift as OptimisticShift])
      }
      pendingMutationsRef.current.delete(shiftId)
      setSyncing(false)
      throw err
    } finally {
      setSyncing(false)
    }
  }, [shifts, refetch])

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

