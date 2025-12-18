/**
 * Drag Controller - Uses refs instead of React state for pointer position
 * 
 * CRITICAL: During drag/resize, React state is NOT the source of truth for pointer position.
 * This controller owns pointer → pixel mapping until drop.
 * Prevents re-render storms during drag.
 */

export interface DragState {
  shiftId: string
  startX: number
  startY: number
  originalStart: Date
  originalEnd: Date
  originalStaffId: string
}

export interface ResizeState {
  shiftId: string
  edge: 'left' | 'right'
  startX: number
  originalStart: Date
  originalEnd: Date
}

export interface CreateState {
  staffId: string
  startX: number
  startTime: Date
}

export class DragController {
  private dragState: DragState | null = null
  private resizeState: ResizeState | null = null
  private createState: CreateState | null = null
  private rafId: number | null = null
  private onUpdate: (preview: any) => void = () => {}
  private isActive = false

  startDrag(state: DragState, onUpdate: (preview: any) => void) {
    this.dragState = state
    this.onUpdate = onUpdate
    this.isActive = true
  }

  startResize(state: ResizeState, onUpdate: (preview: any) => void) {
    this.resizeState = state
    this.onUpdate = onUpdate
    this.isActive = true
  }

  startCreate(state: CreateState, onUpdate: (preview: any) => void) {
    this.createState = state
    this.onUpdate = onUpdate
    this.isActive = true
  }

  update(currentX: number, currentY: number, shiftKey: boolean, computePreview: (state: any, x: number, y: number, shiftKey: boolean) => any) {
    if (!this.isActive) return

    // Cancel previous RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
    }

    // Schedule update via RAF (throttled to 60fps)
    this.rafId = requestAnimationFrame(() => {
      let preview = null
      
      if (this.dragState) {
        preview = computePreview(this.dragState, currentX, currentY, shiftKey)
      } else if (this.resizeState) {
        preview = computePreview(this.resizeState, currentX, currentY, shiftKey)
      } else if (this.createState) {
        preview = computePreview(this.createState, currentX, currentY, shiftKey)
      }

      if (preview) {
        this.onUpdate(preview)
      }

      this.rafId = null
    })
  }

  endDrag(): { type: 'drag' | 'resize' | 'create'; state: any } | null {
    this.isActive = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    if (this.dragState) {
      const state = this.dragState
      this.dragState = null
      return { type: 'drag', state }
    }
    if (this.resizeState) {
      const state = this.resizeState
      this.resizeState = null
      return { type: 'resize', state }
    }
    if (this.createState) {
      const state = this.createState
      this.createState = null
      return { type: 'create', state }
    }
    return null
  }

  cancel() {
    this.isActive = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.dragState = null
    this.resizeState = null
    this.createState = null
  }

  isDragging(): boolean {
    return this.isActive
  }

  getDragState(): DragState | null {
    return this.dragState
  }

  getResizeState(): ResizeState | null {
    return this.resizeState
  }

  getCreateState(): CreateState | null {
    return this.createState
  }
}

