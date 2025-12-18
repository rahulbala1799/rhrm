/**
 * Undo/Redo hook for schedule mutations
 * 
 * Supports Cmd/Ctrl+Z for last mutation (move/resize/create/delete/status)
 * Stack size: 10-30 actions
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Shift } from '@/lib/schedule/types'

export interface UndoableAction {
  type: 'move' | 'resize' | 'create' | 'delete' | 'status'
  shiftId: string
  previousState: Partial<Shift> | null // null for create
  newState: Partial<Shift> | null // null for delete
  execute: () => Promise<void> // Function to redo the action
  reverse: () => Promise<void> // Function to undo the action
}

const MAX_STACK_SIZE = 20

export function useUndoRedo() {
  const [undoStack, setUndoStack] = useState<UndoableAction[]>([])
  const [redoStack, setRedoStack] = useState<UndoableAction[]>([])
  const isExecutingRef = useRef(false)

  const addAction = useCallback((action: UndoableAction) => {
    if (isExecutingRef.current) return // Don't add actions during undo/redo

    setUndoStack((prev) => {
      const newStack = [...prev, action]
      // Limit stack size
      if (newStack.length > MAX_STACK_SIZE) {
        return newStack.slice(-MAX_STACK_SIZE)
      }
      return newStack
    })
    // Clear redo stack on new action
    setRedoStack([])
  }, [])

  const undo = useCallback(async () => {
    if (undoStack.length === 0 || isExecutingRef.current) return

    const action = undoStack[undoStack.length - 1]
    isExecutingRef.current = true

    try {
      await action.reverse()
      setUndoStack((prev) => prev.slice(0, -1))
      setRedoStack((prev) => [...prev, action])
    } catch (error) {
      console.error('Undo failed:', error)
    } finally {
      isExecutingRef.current = false
    }
  }, [undoStack])

  const redo = useCallback(async () => {
    if (redoStack.length === 0 || isExecutingRef.current) return

    const action = redoStack[redoStack.length - 1]
    isExecutingRef.current = true

    try {
      await action.execute()
      setRedoStack((prev) => prev.slice(0, -1))
      setUndoStack((prev) => [...prev, action])
    } catch (error) {
      console.error('Redo failed:', error)
    } finally {
      isExecutingRef.current = false
    }
  }, [redoStack])

  // Keyboard handler for Cmd/Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return {
    addAction,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  }
}

