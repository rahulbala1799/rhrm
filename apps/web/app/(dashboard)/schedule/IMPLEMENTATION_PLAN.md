# Schedule UI UX Hardening - Implementation Plan

## Plan of Attack (PR-Sized Chunks)

### PR1: Caching Layer + SWR Setup ✅
- Install SWR package
- Create cache utilities (`useScheduleCache.ts`)
- Create prefetch utilities (`usePrefetch.ts`)
- **Status:** COMPLETE

### PR2: Upgrade Optimistic Hooks with SWR + Cache Persistence
- Replace `useWeekShifts` with SWR (stale-while-revalidate)
- Replace `useDayShifts` with SWR (stale-while-revalidate)
- Upgrade `useOptimisticShifts` to use SWR + prefetch
- Upgrade `useOptimisticDayShifts` to use SWR + prefetch
- **Critical:** Never clear shifts state on navigation (cache persistence)
- **Critical:** Remove loading states from pages (show cached data immediately)

### PR3: DailyCanvas - RAF Drag Controller + Ghost Overlay + Snap + Animations
- Refactor drag to use refs (not React state) for pointer position
- Add requestAnimationFrame throttling
- Create separate ghost overlay (CSS transforms)
- Add snap guides + time labels (5/10/15 min increments)
- Add settle animation on success (100-150ms)
- Add snap-back + conflict pulse/shake on rollback
- Add time normalization before commit

### PR4: Weekly Grid Virtualization + Navigation Continuity
- Add row virtualization (react-window) if staff > 50
- Ensure navigation shows cached data (no white flash)
- Remove loading states from week page

### PR5: Selection Model
- Single-click selection
- Multi-select (Shift/Cmd+click)
- Escape clears selection
- Delete key handler with confirm
- Visual feedback for selected shifts

### PR6: Undo/Redo System
- Cmd/Ctrl+Z keyboard handler
- Undo stack (10-30 actions)
- Track mutations (move/resize/create/delete/status)
- Optimistic revert on undo
- Reverse mutation in background
- Clear redo stack on new action

### PR7: Context Menu + Offline Detection + Window Focus Refetch
- Pre-render context menu (instant open)
- Offline detection + indicator
- Window focus refetch (rate-limited 30s)
- Silent background refetch after mutations

### PR8: Interaction Lock + Final Polish
- Interaction lock: no undo/redo/selection during drag
- Escape cancels drag immediately
- Performance budget checks (dev-only)
- Final testing + polish

---

## Implementation Status

- [x] PR1: Caching layer
- [ ] PR2: Optimistic hooks upgrade
- [ ] PR3: DailyCanvas improvements
- [ ] PR4: Weekly grid virtualization
- [ ] PR5: Selection model
- [ ] PR6: Undo/redo
- [ ] PR7: Context menu + offline
- [ ] PR8: Interaction lock + polish

