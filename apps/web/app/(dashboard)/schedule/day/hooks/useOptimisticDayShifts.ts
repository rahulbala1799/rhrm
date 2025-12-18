'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { Shift, ShiftUpdateError } from '@/lib/schedule/types'
import { useDayShifts } from './useDayShifts'
import { updateShiftViaAPI, createShiftViaAPI, deleteShiftViaAPI } from '@/lib/schedule/shift-updates'

interface OptimisticShift extends Shift {
  _isOptimistic?: boolean
}

interface PendingMutation {
  shiftId: string
  type: 'create' | 'update' | 'delete'
  optimisticShift?: OptimisticShift
  originalShift?: Shift
}

export function useOptimisticDayShifts(
  date: Date,
  filters?: {
    locationId?: string
    staffId?: string
    status?: string
    includeCancelled?: boolean
  }
) {
  const { shifts: baseShifts, loading, error, conflicts, totals, refetch: baseRefetch } = useDayShifts(date, filters)
  
  const [optimisticShifts, setOptimisticShifts] = useState<OptimisticShift[]>([])
  const [syncing, setSyncing] = useState(false)
  const pendingMutationsRef = useRef<Map<string, PendingMutation>>(new Map())

  // Merge base shifts with optimistic updates
  const shifts = useMemo(() => {
    const baseMap = new Map(baseShifts.map(s => [s.id, s]))
    optimisticShifts.forEach(opt => {
      // Only show optimistic if mutation is still pending
      if (pendingMutationsRef.current.has(opt.id)) {
        baseMap.set(opt.id, opt)
      }
    })
    return Array.from(baseMap.values())
  }, [baseShifts, optimisticShifts])

  const updateShift = useCallback(async (shiftId: string, updates: Partial<Shift>): Promise<Shift> => {
    const existingShift = shifts.find(s => s.id === shiftId)
    if (!existingShift) {
      throw {
        code: 'NOT_FOUND' as const,
        message: 'Shift not found',
      } as ShiftUpdateError
    }

    // Create optimistic update
    const optimisticShift: OptimisticShift = {
      ...existingShift,
      ...updates,
      _isOptimistic: true,
    }

    // Update optimistic state immediately
    setOptimisticShifts(prev => {
      const filtered = prev.filter(s => s.id !== shiftId)
      return [...filtered, optimisticShift]
    })
    setSyncing(true)

    const mutation: PendingMutation = {
      shiftId,
      type: 'update',
      optimisticShift,
      originalShift: existingShift,
    }
    pendingMutationsRef.current.set(shiftId, mutation)

    try {
      // Use shared utility
      const realShift = await updateShiftViaAPI(shiftId, updates)

      // Replace optimistic with real
      setOptimisticShifts(prev => {
        const filtered = prev.filter(s => s.id !== shiftId)
        return [...filtered, realShift]
      })

      pendingMutationsRef.current.delete(shiftId)
      
      // Background refetch
      baseRefetch()
      
      return realShift
    } catch (err) {
      // Revert optimistic update
      setOptimisticShifts(prev => prev.filter(s => s.id !== shiftId))
      pendingMutationsRef.current.delete(shiftId)
      setSyncing(false)
      // Re-throw ShiftUpdateError
      throw err
    } finally {
      setSyncing(false)
    }
  }, [shifts, baseRefetch])

  const createShift = useCallback(async (shiftData: Partial<Shift>): Promise<Shift> => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
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
      _isOptimistic: true,
    }

    // Add to optimistic state immediately
    setOptimisticShifts(prev => [...prev, optimisticShift])
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

      // Replace optimistic with real
      setOptimisticShifts(prev => {
        const filtered = prev.filter(s => s.id !== tempId)
        return [...filtered, realShift]
      })

      pendingMutationsRef.current.delete(tempId)
      
      // Background refetch
      baseRefetch()
      
      return realShift
    } catch (err) {
      // Revert optimistic update
      setOptimisticShifts(prev => prev.filter(s => s.id !== tempId))
      pendingMutationsRef.current.delete(tempId)
      setSyncing(false)
      // Re-throw ShiftUpdateError
      throw err
    } finally {
      setSyncing(false)
    }
  }, [baseRefetch])

  const deleteShift = useCallback(async (shiftId: string): Promise<void> => {
    const existingShift = shifts.find(s => s.id === shiftId)
    if (!existingShift) {
      throw {
        code: 'NOT_FOUND' as const,
        message: 'Shift not found',
      } as ShiftUpdateError
    }

    // Remove from optimistic state immediately
    setOptimisticShifts(prev => prev.filter(s => s.id !== shiftId))
    setSyncing(true)

    const mutation: PendingMutation = {
      shiftId,
      type: 'delete',
      originalShift: existingShift,
    }
    pendingMutationsRef.current.set(shiftId, mutation)

    try {
      // Use shared utility
      await deleteShiftViaAPI(shiftId)

      pendingMutationsRef.current.delete(shiftId)
      
      // Background refetch
      baseRefetch()
    } catch (err) {
      // Revert: add back original shift
      setOptimisticShifts(prev => [...prev, existingShift as OptimisticShift])
      pendingMutationsRef.current.delete(shiftId)
      setSyncing(false)
      // Re-throw ShiftUpdateError
      throw err
    } finally {
      setSyncing(false)
    }
  }, [shifts, baseRefetch])

  return {
    shifts,
    loading,
    error,
    conflicts,
    totals,
    syncing,
    updateShift,
    createShift,
    deleteShift,
    refetch: baseRefetch,
  }
}

