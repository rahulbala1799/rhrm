# Schedule UI UX Hardening: Design-Software Feel

**Build Contract + Implementation Guide**

This document defines the non-negotiable UX guarantees and implementation strategy for making the Schedule UI (Daily Canvas + Weekly Grid) feel like **Figma / Notion / modern design software**: instant, fluid, and "loading-free".

---

## 0. Why This Exists

This UI is intentionally engineered to behave like professional design software (Figma, Notion, etc.).

**Any change that introduces visible loading, blocking state, or delayed feedback is a regression unless explicitly approved.**

The Schedule UI must feel instant and responsive. Users should never wait for the UI to respond to their actions. This is not a "nice to have" — it is a core requirement that prevents the UI from feeling sluggish or unprofessional.

**Enforcement:**
- Code reviews MUST reject PRs that add blocking loading states
- Performance regressions MUST be caught in testing
- Navigation MUST never show blank/loading states after first paint

---

## 1. UX Principles & Guarantees

### 1.1 "Loading-Free" Definition

**Loading-free does NOT mean "no network calls."**

It means:
- ✅ UI responds **immediately** on input (drag, click, right click, keyboard)
- ✅ UI state updates **instantly** via optimistic updates
- ✅ Server sync is **invisible** unless it fails
- ✅ Background refetch updates **silently**
- ✅ Navigation feels **instant** because next/prev data is prefetched

### 1.2 Allowed Loading Indicators

The **only** allowed "loading" indicators:
- Very subtle "Syncing…" indicator somewhere non-blocking (optional, top bar only)
- Disabled state only for destructive actions if required
- Error banners/toasts on failure

**MUST NOT:**
- ❌ Spinners blocking the schedule grid/canvas
- ❌ Loading overlays on the schedule view
- ❌ Blocking spinners on week/day navigation
- ❌ Loading states that prevent interaction
- ❌ Loading/skeleton states after first paint

**Hard Rule:**
- **Schedule grid/canvas MUST NEVER render a loading/skeleton state after first paint.**
- **First paint = app boot or tenant switch only. Navigation ≠ first paint.**
- **MUST NOT** use `if (loading) return <Skeleton />` or similar patterns in schedule views.

**First Paint Implementation Note:**
- **First paint is allowed to show skeleton ONLY if cache is empty (cold boot / tenant switch).**
- **After that, schedule views MUST always render either:**
  - Cached data, OR
  - Cached data + "Syncing…" indicator (optional, non-blocking)
- **This prevents someone saying "but on refresh the cache is empty so I need a skeleton everywhere."**
- **After first paint, cache should never be empty (stale-while-revalidate ensures cached data exists).**

### 1.3 Core Guarantees

1. **Drag interactions MUST feel instant** - no visible lag during drag operations
2. **Navigation MUST be instant** - week/day changes show cached data immediately
3. **Mutations MUST be optimistic** - UI updates before server confirms
4. **Context menus MUST open instantly** - no async work before showing menu
5. **Background sync MUST be silent** - updates happen invisibly after optimistic commit

---

## 2. Interaction Contracts

### 2.1 Daily Canvas Interactions

**Drag-to-Move:**
- **MUST** update visual position immediately on mousemove (no server call during drag)
- **MUST** commit mutation on mouseup (optimistic update)
- **MUST** show visual feedback (ghost preview) during drag
- **MUST** rollback instantly if mutation fails (409/403/400)
- **MUST** use requestAnimationFrame throttling for drag updates
- **MUST** show snap guides and time labels while dragging (when snapping enabled)

**Drag-to-Resize:**
- **MUST** update visual size immediately on mousemove
- **MUST** commit mutation on mouseup (optimistic update)
- **MUST** show snap lines when snapping is enabled
- **MUST** rollback instantly if mutation fails
- **MUST** show snap guides and time labels while resizing (when snapping enabled)

**Right-Click Context Menu:**
- **MUST** open immediately (no async work)
- **MUST** trigger optimistic updates on action click
- **MUST** close instantly; errors show toast

**Shift Creation (Drag on Empty Row):**
- **MUST** show preview block during drag
- **MUST** create optimistically on drop
- **MUST** validate overlap client-side for UX hints only (server is source of truth)
- **MUST NOT** block drop based on client-side validation (server is source of truth)

**Time Normalization (Single Source of Truth):**
- **All drag/resize results MUST be normalized (snap increment + timezone rules) before commit.**
- **Server stores canonical timestamps; UI never stores "pixel-time" state.**
- **MUST** round to snap increment (5/10/15 min) before sending to server
- **MUST** apply timezone conversion using tenant timezone before commit
- **This prevents "09:00 → 08:59" drift bugs after repeated moves.**
- **Implementation:** Normalize time in drag handler before creating mutation payload

### 2.2 Weekly Grid Interactions

**Drag-to-Move:**
- **MUST** update visual position immediately during drag
- **MUST** commit mutation on drop (optimistic update)
- **MUST** preserve clock times in tenant timezone when moving to new day
- **MUST** rollback instantly if mutation fails

**Modal Edit:**
- **MUST** open instantly (no async work)
- **MUST** update optimistically on save
- **MUST** show toast on success/error

**Week Navigation:**
- **MUST** show cached data immediately (no spinner)
- **MUST** prefetch next/previous week on idle
- **MUST** cancel prefetch if user navigates quickly
- **MUST** maintain visual continuity: old data stays visible, new data patches in
- **MUST NOT** show blank/white flash during navigation
- **MUST NOT** clear existing data before new data loads

### 2.3 Keyboard Interactions

**MUST support:**
- Arrow keys for navigation (when implemented)
- Escape to close modals/context menus
- Enter to confirm actions
- Delete/Backspace to delete selected shifts (when implemented)

**MUST NOT:**
- Block keyboard input during mutations
- Require keyboard shortcuts to wait for server response

**Interaction Lock (Critical):**
- **MUST NOT allow undo/redo during active drag/resize** - Prevents conflicts and state corruption
- **MUST cancel drag cleanly on Escape** - Revert ghost immediately, discard editor state
- **MUST NOT allow selection changes during active drag** - Selection locked during drag operation
- **MUST NOT allow context menu during active drag** - Right-click cancels drag instead
- **Implementation:** Track active drag state, disable undo/redo/selection handlers when drag is active
- **On Escape during drag:** Immediately cancel drag, revert ghost to original position, clear drag state

---

## 3. State Management Strategy

### 3.1 Editor State vs Server State

**Editor State (Local, Temporary):**
- Drag position during active drag
- Resize dimensions during active resize
- Preview blocks during creation
- Context menu position
- Selection state

**Server State (Cached, Optimistic):**
- Shift data (from cache + optimistic updates)
- Staff list (cached)
- Locations (cached)
- Conflicts (cached, refreshed in background)

**Separation Rules:**
- **MUST** maintain editor state separately from server state during drag
- **MUST** commit editor state to server state on drop/confirm
- **MUST** discard editor state on cancel/error
- **MUST NOT** trigger React re-renders on every mousemove during drag
- **MUST** normalize time (snap increment + timezone) before commit - See Time Normalization rule in Section 2.1

**Interaction Authority (Critical):**
- **During drag/resize, React state is NOT the source of truth for pointer position.**
- **A dedicated drag controller (local ref or store) MUST own pointer → pixel mapping until drop.**
- **MUST NOT** put mousemove events into React state during active drag.
- **MUST** use refs or external drag controller for drag position tracking.
- This prevents someone later "simplifying" drag by putting mousemove into React state, which causes re-render storms.

### 3.2 Optimistic Update Contract

**Always Instant:**
1. User action triggers optimistic update immediately
2. UI reflects optimistic state instantly
3. Mutation sent to server in background
4. On success: replace optimistic with server response (silent)
5. On failure: rollback optimistic state instantly + show toast

**Rollback Rules:**
- **MUST** revert to original state on any error (409/403/400/500/network)
- **MUST** show toast with error message
- **MUST** not show multiple toasts for same error
- **MUST** handle out-of-order responses (ignore stale mutations)

**Toast Rules:**
- Success toasts: auto-dismiss after 2-3 seconds
- Error toasts: persist until user dismisses or new action
- **MUST NOT** show success toast for every optimistic update (only on explicit user actions like "Save")

---

## 4. Caching + Prefetch Plan

### 4.1 Cache Strategy (SWR / React Query)

**MUST use a single caching solution:**
- **Recommended:** SWR (stale-while-revalidate) or React Query
- **MUST** use stale-while-revalidate: show cached data immediately, refresh in background
- **MUST** avoid refetching on every focus/hover unless rate-limited

**Cache Keys:**
- Weekly: `['schedule', 'week', tenantId, weekStartDateISO, filters]`
- Daily: `['schedule', 'day', tenantId, dateISO, filters]`
- Staff: `['staff', tenantId]`
- Locations: `['locations', tenantId]`
- Roles: `['roles', tenantId]`

**Cache Invalidation:**
- **MUST** invalidate affected week/day cache after successful mutation
- **MUST** invalidate all week caches if mutation affects multiple weeks
- **MUST** use background refetch after optimistic update (don't wait for it)

### 4.2 Navigation Prefetch

**Weekly View:**
- **MUST** prefetch next week on idle after current week loads
- **MUST** prefetch previous week on idle after current week loads
- **MUST** cancel prefetch if user navigates quickly (avoid wasted work)
- **MUST** use low-priority fetch (requestIdleCallback or similar)
- **MUST** maintain visual continuity: old week data stays visible, new week data patches in
- **MUST NOT** show blank/white flash during week navigation

**Daily View:**
- **MUST** prefetch next day on idle after current day loads
- **MUST** prefetch previous day on idle after current day loads
- **MUST** cancel prefetch if user navigates quickly
- **MUST** maintain visual continuity: old day data stays visible, new day data patches in
- **MUST NOT** show blank/white flash during day navigation

**Fast Navigation Behavior:**
- When navigating weeks/days:
  - Old data MUST stay visible
  - New data MUST replace server state silently, but visual continuity MUST be preserved (no blank)
  - UI MUST never go blank
  - This avoids "white flash" regressions
- **In practice:** Keep old UI visible until you can swap in new data, not "merge forever"
- **New data replaces server state** (e.g., if shift deleted on server, it disappears), but **visual continuity is preserved** (no blank state)

**Cache Persistence Rule (Critical):**
- **On week/day change, MUST NOT clear shifts state.**
- **MUST NEVER set shifts to `[]` as an intermediate state.**
- **The UI MUST render "previous view data" until the new view cache resolves.**
- **This is the #1 cause of white flash regressions.**
- **Implementation:** Use stale-while-revalidate pattern: show previous week/day data immediately, swap in new data when ready

**Implementation:**
- Prefetch in hook level, not component level
- Use `requestIdleCallback` or `setTimeout` with delay
- Cancel previous prefetch on navigation change
- Use stale-while-revalidate: show cached data immediately, update in background
- Never clear state array on navigation change

### 4.3 Staff/Locations/Roles Caching

**MUST cache:**
- Staff list (long TTL, invalidate on staff create/update)
- Locations (long TTL, invalidate on location create/update)
- Roles (long TTL, invalidate on role create/update)

**MUST NOT:**
- Refetch staff list on every week/day navigation
- Refetch locations on every interaction

---

## 5. Optimistic Updates Contract

### 5.1 Update Flow

```
User Action → Optimistic Update (instant) → Background Mutation → Success/Error
                                                                    ↓
                                                          Replace/Rollback
```

**MUST:**
1. Update optimistic state immediately (before server call)
2. Send mutation in background
3. Replace optimistic with server response on success
4. Rollback optimistic on error
5. Show toast only on error (or explicit success actions)

**MUST NOT:**
1. Wait for server response before updating UI
2. Show loading spinner during mutation
3. Block UI during mutation
4. Show success toast for every optimistic update

**Toast Rules (Clarified):**
- **Implicit actions (drag, resize, move):** No success toast (action is self-evident)
- **Explicit actions (modal save, publish button, delete confirm):** Success toast allowed
- **All errors:** Always show toast with error message

### 5.2 Conflict Handling

**Server-side validation is source of truth:**
- Client-side overlap checks are UX hints only
- Server returns 409 on overlap
- **MUST** rollback optimistic update on 409
- **MUST** show toast with overlap message
- **MUST** provide immediate spatial feedback on rollback (snap-back animation preferred, ~150ms)
- **MUST** make rollback visually obvious (briefly pulse conflicting shift, shake dragged block, or snap-back animation)

**Micro-Interactions for Trust:**
- **Snap-back rollback animation:** ~150ms smooth animation when mutation fails
- **On successful drop:** Subtle "settle" animation (100-150ms) - shift gently settles into position
- **Conflict feedback:** Pulse conflicting block + shake dragged ghost simultaneously
- **Background sync:** Tiny dot/spinner in toolbar only (never blocking) - optional, very subtle

**Out-of-order responses:**
- **MUST** track mutation timestamps
- **MUST** ignore stale responses (older than current optimistic state)
- **MUST** dedupe repeated updates to same shift (last-write-wins locally)

### 5.3 Error Handling

**Error Codes:**
- `409 OVERLAP` → Rollback + toast: "Shift overlaps with another shift"
- `403 FORBIDDEN` → Rollback + toast: "Not allowed: you don't have permission"
- `400 VALIDATION` → Rollback + toast: error message from server
- `404 NOT_FOUND` → Rollback + toast: "Shift not found"
- `NETWORK` → Rollback + toast: "Network error, try again"
- `UNKNOWN` → Rollback + toast: "An error occurred"

**MUST:**
- Use `ShiftUpdateError` type (already exists)
- Parse errors via `parseShiftUpdateError` utility (already exists)
- Never use string matching on error messages

---

## 6. Performance Engineering Plan

### 6.1 Virtualization

**Weekly Grid:**
- **MUST** virtualize staff rows if staff count > 50
- **MUST** use `react-window` or `react-virtual` for row virtualization
- **MUST** render only visible rows + small buffer

**Daily Canvas:**
- **MUST** minimize re-renders (ShiftBlock memoization)
- **MUST** avoid rendering offscreen heavy components
- **MUST** use `React.memo` for ShiftBlock component

### 6.2 Rendering Strategy

**Memoization Boundaries:**
- **MUST** memoize ShiftBlock component (already done)
- **MUST** use stable callbacks (useCallback) for event handlers
- **MUST** use useMemo for expensive computations (shift grouping, sorting)

**Re-render Prevention:**
- **MUST** avoid re-rendering entire grid on every drag mousemove
- **MUST** use local state for drag preview (not in main state)
- **MUST** use CSS transforms for drag ghost (not React re-renders)

### 6.3 Drag Performance

**MUST:**
- Use `requestAnimationFrame` throttling for drag updates
- Use lightweight transforms (CSS `transform`) during drag
- Commit final state at drag end (not every mousemove)
- Avoid expensive calculations during drag (pre-calculate or cache)

**MUST NOT:**
- Trigger React re-renders on every mousemove
- Recalculate shift positions on every mousemove
- Call overlap checks on every mousemove (only on drop)

**Drag Ghost Rendering:**
- **MUST** render drag ghost as separate overlay (not part of main grid)
- **MUST** use CSS transforms for position updates
- **MUST** avoid re-rendering underlying grid during drag

### 6.4 Snap + Guides (Figma-Like Snapping)

**This is the "Figma vibe" - makes scheduling feel precise and professional.**

**MUST support:**
- Snap to 5 / 10 / 15 minute increments (user-controllable toggle)
- Show guide line + time label while dragging
- Soft snap (magnet feel) not hard blocking
- **Bonus:** Snap to other shift edges for clean alignment

**Implementation:**
- Calculate snap positions based on selected increment (5/10/15 min)
- Show visual guide line at snap position during drag
- Display time label (e.g., "09:00") at snap position
- Use "magnet" effect: shift snaps when within threshold (e.g., 5px)
- Optional: Detect nearby shift edges and snap to them for alignment

**Visual Feedback:**
- Guide line: vertical/horizontal line at snap position (blue, semi-transparent)
- Time label: small text showing snapped time (e.g., "09:00")
- Magnet effect: subtle animation when entering snap zone
- Snap indicator: brief highlight when snap occurs

**MUST:**
- Snap feel responsive (not laggy)
- Guide lines update smoothly during drag
- Time labels are readable but non-intrusive
- Snap is optional (toggle on/off)

**MUST NOT:**
- Block drag if not snapped (soft snap, not hard blocking)
- Show too many guide lines (only show relevant ones)

### 6.5 Throttling & Debouncing

**Mutations:**
- **MUST** debounce rapid mutations to same shift (wait 300ms)
- **MUST** coalesce multiple updates to same shift (last-write-wins)
- **MUST** abort stale requests when new mutation starts

**Prefetch:**
- **MUST** throttle prefetch requests (max 1 per second)
- **MUST** cancel prefetch if user navigates before it completes

---

## 7. Right-Click + Keyboard UX

### 7.1 Context Menus

**MUST:**
- Open immediately on right-click (no async work)
- Show menu at cursor position
- Close on click outside or Escape key
- Trigger optimistic updates on action click
- Show toast on error (not blocking)

**MUST NOT:**
- Wait for server response before showing menu
- Block menu rendering on any async work
- Show loading state in menu

**Implementation:**
- Pre-render menu component (hidden)
- Show/hide via state (no async work)
- Actions trigger optimistic updates (same as other mutations)

### 7.2 Keyboard Shortcuts

**MUST support (when implemented):**
- `Escape` → Close modals/context menus, clear selection
- `Enter` → Confirm actions in modals
- `Delete` / `Backspace` → Delete selected shifts (with confirm or soft delete)
- `Cmd/Ctrl+Z` → Undo last mutation (move/resize/create/delete/status)
- `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` → Redo (when implemented)
- Arrow keys → Navigate selection (when implemented)

**MUST:**
- Respond instantly (no server wait)
- Work during drag operations (when applicable)
- Not block on mutations

### 7.3 Focus Management

**MUST:**
- Maintain focus during optimistic updates
- Return focus after modal close
- Handle focus trap in modals

### 7.4 Undo/Redo System

**Design tools feel "safe" because you can always undo.**

**MUST support:**
- `Cmd/Ctrl+Z` → Undo last mutation (move/resize/create/delete/status change)
- Keep a small action stack (10-30 actions recommended)
- Works perfectly with optimistic updates: push action on commit, revert locally, then send reverse mutation in background

**Implementation:**
- Track mutations in undo stack: `{ type: 'move' | 'resize' | 'create' | 'delete' | 'status', shiftId, beforeState, afterState }`
- On undo: revert optimistic state immediately, send reverse mutation to server
- On undo success: remove from undo stack, add to redo stack
- On undo failure: rollback optimistic state, show toast

**MUST:**
- Undo instantly (optimistic revert)
- Support undo for all mutation types (move, resize, create, delete, status)
- Clear redo stack when new action is performed
- Limit stack size (10-30 actions) to prevent memory issues

**MUST NOT:**
- Block undo on server response (optimistic revert first)
- Allow undo during active drag/resize (only after drop/confirm) - See Interaction Lock rule

**Interaction Lock:**
- **MUST NOT allow undo/redo during active drag/resize** - Prevents conflicts with editor state
- Undo/redo only available when no drag/resize is active
- This prevents state corruption from conflicting operations

### 7.5 Selection Model

**Right now you have interactions, but "design software" needs selection.**

**MUST support:**
- Click selects single shift
- Shift-click or Cmd/Ctrl-click multi-selects
- Escape clears selection
- Delete removes selected with confirm (or "soft delete")
- **Optional V2:** Dragging a selected block moves all selected

**Visual Feedback:**
- Selected shifts show visual indicator (border, highlight, or checkmark)
- Selection persists during navigation (if shifts still visible)
- Selection cleared on Escape or click outside

**Implementation:**
- Track selected shift IDs in state
- Handle click events: single click = select, shift/cmd+click = toggle multi-select
- Delete key triggers delete confirmation for selected shifts
- Selection state is editor state (local, temporary)

**MUST:**
- Selection feels instant (no lag)
- Multi-select works smoothly
- Clear selection on Escape
- Show visual feedback for selected shifts

**MUST NOT:**
- Block selection on mutations
- Require server response for selection changes
- Allow selection changes during active drag/resize - See Interaction Lock rule in Section 2.3

---

## 8. Network Strategy

### 8.1 Debounce & Coalesce

**Drag/Resize Mutations:**
- **MUST** send exactly 1 mutation on drop (no debounce needed)
- Drag/resize already only mutates on mouseup, so debounce would introduce weirdness
- **MUST NOT** debounce drag/resize operations (they already only mutate once on drop)

**Modal Typing Fields / Quick Status Toggles:**
- **MUST** debounce/coalesce if needed (300ms recommended)
- **MUST** coalesce multiple updates (last-write-wins)
- **MUST** send only final state to server

**Example:**
```
User drags shift → 50 mousemove events → Only 1 mutation on drop (no debounce)
User types in modal notes field → debounce 300ms → send final text
User toggles status rapidly → coalesce → send final status
```

**Refined Rule:**
- **Drag/resize:** Exactly 1 mutation on drop (no debounce)
- **Modal typing fields / quick status toggles:** Debounce/coalesce if needed (300ms)
- This avoids accidental "why did it wait 300ms to save?" vibes on drag operations

### 8.2 Abort Stale Requests

**MUST:**
- Abort previous mutation if new one starts for same shift
- Use `AbortController` for fetch cancellation
- Ignore responses from aborted requests

**Implementation:**
```typescript
const abortControllerRef = useRef<AbortController | null>(null)

// On new mutation:
if (abortControllerRef.current) {
  abortControllerRef.current.abort()
}
abortControllerRef.current = new AbortController()
```

### 8.3 Retry Strategy

**MUST:**
- Retry network errors (not 4xx errors) with exponential backoff
- Max 3 retries
- Show toast on final failure
- **MUST NOT** reapply optimistic state again on retry (prevents double-apply bugs)
- Track retry attempts separately from optimistic state

**MUST NOT:**
- Retry 409/403/400 errors (these are permanent)
- Retry indefinitely
- Re-apply optimistic updates on retry (optimistic state is already applied)

### 8.4 Offline Hints

**MUST:**
- Detect offline state (navigator.onLine or fetch error)
- Show subtle indicator when offline
- Queue mutations when offline (optional, future enhancement)
- Show toast on offline detection

**MUST NOT:**
- Block UI when offline (show cached data)
- Prevent optimistic updates when offline (queue for later)

### 8.5 Multi-Tab / Multi-User Behavior (Without Realtime)

**Even without Supabase Realtime, multiple admins/users can edit simultaneously.**

**MUST:**
- **Conflicts from server (409, etc.) are authoritative and MUST rollback** - Server is source of truth
- **Silent refetch after successful mutation is mandatory** - Ensures UI reflects server state
- **Optional:** Refresh schedule on window focus but rate-limited (e.g., 30-60s minimum between refreshes)
- This prevents "it looked correct for me but not for them" surprises

**Implementation:**
- After every successful mutation, trigger background refetch of affected week/day
- On window focus, check if last refresh was > 30s ago, then refetch silently
- Server conflicts (409) always win - rollback optimistic state immediately
- Silent refetch ensures UI eventually converges to server state

**MUST NOT:**
- Assume single-user editing (always handle conflicts gracefully)
- Skip background refetch after mutations (required for multi-user consistency)
- Show loading state for background refetch (must be silent)

---

## 9. Implementation Checklist

### 9.1 Caching Layer

- [ ] Install and configure SWR or React Query
- [ ] Create cache key utilities for schedule data
- [ ] Implement stale-while-revalidate for week/day data
- [ ] Implement long TTL caching for staff/locations/roles
- [ ] Add cache invalidation after mutations

### 9.2 Prefetch Implementation

- [ ] Implement week prefetch in `useOptimisticShifts` hook
- [ ] Implement day prefetch in `useOptimisticDayShifts` hook
- [ ] Add prefetch cancellation on navigation
- [ ] Use `requestIdleCallback` or `setTimeout` for low-priority prefetch

### 9.3 Optimistic Updates Enhancement

- [ ] Ensure all mutations use optimistic updates (already done)
- [ ] Add mutation timestamp tracking for out-of-order detection
- [ ] Implement deduplication for rapid updates
- [ ] Add rollback on all error codes (already done, verify)

### 9.4 Drag Performance

- [ ] Add `requestAnimationFrame` throttling to drag handlers
- [ ] Move drag preview to separate overlay (CSS transforms)
- [ ] Pre-calculate expensive drag computations
- [ ] Minimize re-renders during drag (use local state)

### 9.5 Virtualization

- [ ] Add row virtualization to Weekly grid (if staff count > 50)
- [ ] Verify ShiftBlock memoization in Daily canvas
- [ ] Add performance markers (dev only)

### 9.6 Context Menu

- [ ] Verify context menu opens instantly (no async work)
- [ ] Ensure actions trigger optimistic updates
- [ ] Add keyboard support (Escape to close)

### 9.11 Undo/Redo System

- [ ] Implement undo stack (10-30 actions)
- [ ] Add Cmd/Ctrl+Z keyboard handler
- [ ] Track mutations for undo (move/resize/create/delete/status)
- [ ] Implement optimistic revert on undo
- [ ] Send reverse mutation to server on undo

### 9.12 Snap + Guides

- [ ] Add snap toggle (5/10/15 min increments)
- [ ] Show guide lines during drag/resize
- [ ] Display time labels at snap positions
- [ ] Implement soft snap (magnet effect)
- [ ] Optional: Snap to other shift edges

### 9.13 Selection Model

- [ ] Implement single-click selection
- [ ] Implement multi-select (Shift/Cmd+click)
- [ ] Add Escape to clear selection
- [ ] Add Delete key handler for selected shifts
- [ ] Show visual feedback for selected shifts

### 9.14 Micro-Interactions

- [ ] Add snap-back rollback animation (~150ms)
- [ ] Add settle animation on successful drop (100-150ms)
- [ ] Add conflict feedback (pulse + shake)
- [ ] Add subtle sync indicator in toolbar (optional)

### 9.7 Network Optimization

- [ ] Add debounce to modal typing fields / status toggles (300ms) - NOT for drag/resize
- [ ] Implement request abortion for stale mutations
- [ ] Add retry logic for network errors
- [ ] Add offline detection and indicator

### 9.8 Loading State Removal

- [ ] Remove blocking spinners from schedule views
- [ ] Replace with subtle "Syncing…" indicator (optional)
- [ ] Ensure navigation shows cached data immediately
- [ ] Remove loading overlays from grid/canvas

### 9.9 Error Handling

- [ ] Verify all errors use `ShiftUpdateError` type
- [ ] Verify all errors use `parseShiftUpdateError` utility
- [ ] Ensure rollback happens on all error codes
- [ ] Verify toast messages are user-friendly

### 9.10 Observability

- [ ] Add performance markers (dev only)
- [ ] Log slow renders (dev only)
- [ ] Log slow network calls (dev only)
- [ ] Add dev flag to enable/disable performance logging

---

## 10. Testing Checklist

### 10.1 Manual Testing

**Drag Interactions:**
- [ ] Drag shift in Daily view - must feel instant, no lag
- [ ] Drag shift in Weekly view - must feel instant, no lag
- [ ] Resize shift in Daily view - must feel instant, no lag
- [ ] Create shift by dragging - must show preview instantly
- [ ] Drag fails (overlap) - must rollback instantly + show toast

**Navigation:**
- [ ] Navigate between weeks - must show immediately (cached)
- [ ] Navigate between days - must show immediately (cached)
- [ ] Rapid navigation - must not show spinners
- [ ] Prefetch works - verify in Network tab (next/prev loaded)

**Context Menus:**
- [ ] Right-click opens instantly
- [ ] Actions trigger optimistic updates
- [ ] Errors show toast, not blocking

**Optimistic Updates:**
- [ ] Update shift - UI updates instantly
- [ ] Create shift - appears instantly
- [ ] Delete shift - disappears instantly
- [ ] Error rollback - reverts instantly + toast

**Performance:**
- [ ] Drag at 60fps (check in DevTools Performance tab)
- [ ] No jank during drag
- [ ] No re-render storms (check React DevTools Profiler)

### 10.2 Automated Testing

- [ ] Unit tests for optimistic update hooks
- [ ] Unit tests for cache key generation
- [ ] Unit tests for prefetch cancellation
- [ ] Integration tests for drag interactions
- [ ] Integration tests for error rollback

---

## 11. Anti-Patterns (Things We Ban)

### 11.1 Loading States

**MUST NOT:**
- ❌ Show loading spinner on schedule grid/canvas
- ❌ Show loading overlay during mutations
- ❌ Block navigation with loading state
- ❌ Show loading state for prefetch operations

### 11.2 Direct Fetch in Components

**MUST NOT:**
- ❌ Call `fetch` directly in page components for mutations
- ❌ Use `useEffect` with `fetch` for data loading (use SWR/React Query)
- ❌ Create new fetch calls for every navigation

### 11.3 Timezone Conversions

**MUST NOT:**
- ❌ Do timezone conversions ad-hoc in UI components
- ❌ Use browser locale for timezone (use tenant timezone)
- ❌ Use `new Date()` with local parsing

**MUST:**
- ✅ Use shared utilities (`applyTimeToDate`, `toTenantTimezone`, etc.)
- ✅ Use tenant IANA timezone string (not browser locale)

### 11.4 Error Handling

**MUST NOT:**
- ❌ Use string matching on error messages
- ❌ Create custom error types (use `ShiftUpdateError`)
- ❌ Ignore error codes (handle all codes)

### 11.5 Realtime

**MUST NOT:**
- ❌ Introduce Supabase Realtime in V1 (out of scope)
- ❌ Require realtime for optimistic updates to work

**Note:** Can design hook point for realtime later, but it must not be required.

### 11.6 Re-render Storms

**MUST NOT:**
- ❌ Trigger React re-renders on every mousemove during drag
- ❌ Recalculate expensive computations on every render
- ❌ Create new objects/arrays in render (use useMemo/useCallback)

---

## 12. Definition of Done

The Schedule UI is "done" when:

1. ✅ **Drag has no visible jank** - verified at 60fps in DevTools
2. ✅ **Move between weeks has no spinner** - shows cached data immediately
3. ✅ **Move between days has no spinner** - shows cached data immediately
4. ✅ **Updates show instantly** - optimistic updates work for all mutations
5. ✅ **Rollback works correctly** - errors revert UI instantly + show toast
6. ✅ **Right-click actions feel instant** - context menu opens immediately
7. ✅ **Prefetch works** - verified via Network tab (next/prev loaded on idle)
8. ✅ **No blocking loading states** - no spinners on grid/canvas
9. ✅ **Background sync is silent** - updates happen invisibly
10. ✅ **Performance is acceptable** - no jank, smooth interactions

---

## 13. Recommended Libraries

**Caching:**
- **SWR** (`swr`) - Recommended for simplicity
- **React Query** (`@tanstack/react-query`) - Alternative, more features

**Virtualization:**
- **react-window** - For row virtualization in Weekly grid
- **react-virtual** - Alternative

**Performance:**
- Use native `requestAnimationFrame` for drag throttling
- Use native `AbortController` for request cancellation

---

## 14. File-Level Implementation Tasks

### 14.1 Caching Layer

**New Files:**
- `apps/web/app/(dashboard)/schedule/hooks/useScheduleCache.ts` - Cache utilities
- `apps/web/app/(dashboard)/schedule/hooks/usePrefetch.ts` - Prefetch logic

**Modified Files:**
- `apps/web/app/(dashboard)/schedule/week/hooks/useOptimisticShifts.ts` - Add prefetch
- `apps/web/app/(dashboard)/schedule/day/hooks/useOptimisticDayShifts.ts` - Add prefetch
- `apps/web/app/(dashboard)/schedule/week/page.tsx` - Remove loading spinners
- `apps/web/app/(dashboard)/schedule/day/page.tsx` - Remove loading spinners

### 14.2 Drag Performance

**Modified Files:**
- `apps/web/app/(dashboard)/schedule/day/components/DailyCanvas.tsx` - Add RAF throttling, drag ghost overlay
- `apps/web/app/(dashboard)/schedule/week/components/StaffRowScheduler.tsx` - Add RAF throttling (if drag exists)

### 14.3 Virtualization

**Modified Files:**
- `apps/web/app/(dashboard)/schedule/week/components/StaffRowScheduler.tsx` - Add row virtualization

### 14.4 Network Optimization

**Modified Files:**
- `apps/web/lib/schedule/shift-updates.ts` - Add debounce, abort controller support
- `apps/web/app/(dashboard)/schedule/week/hooks/useOptimisticShifts.ts` - Add debounce
- `apps/web/app/(dashboard)/schedule/day/hooks/useOptimisticDayShifts.ts` - Add debounce

### 14.5 Context Menu

**Modified Files:**
- `apps/web/app/(dashboard)/schedule/day/components/ShiftContextMenu.tsx` - Verify instant open
- `apps/web/app/(dashboard)/schedule/week/components/ShiftBlock.tsx` - Verify instant open

---

## 15. Performance Targets & Budgets

**Drag Performance:**
- Target: 60fps during drag operations
- Max frame time: 16.67ms per frame
- No visible jank or stuttering

**Navigation Performance:**
- Target: < 50ms to show cached data
- Target: < 100ms to show fresh data (if not cached)
- No blocking spinners

**Mutation Performance:**
- Target: < 16ms to show optimistic update
- Target: < 500ms for server response (background)
- No blocking UI during mutation

**Context Menu Performance:**
- Target: < 16ms to show menu
- No async work before showing menu

### 15.1 Performance Budget (Hard Limits)

**These are hard guardrails to prevent performance creep over time.**

**Rendering Budget:**
- **Week view MUST render under 200ms for 100 staff** - Measured from navigation click to first paint
- **Daily view MUST render under 150ms for 50 staff** - Measured from navigation click to first paint
- **No more than 50 components re-render on drag** - Dev-only profiler check (React DevTools)
- **No more than 20 components re-render on navigation** - Dev-only profiler check

**Drag Budget:**
- **Max 5 components re-render per drag mousemove** - Dev-only profiler check
- **Drag ghost update MUST be < 8ms** - Measured via performance.mark
- **Total drag overhead MUST be < 2ms per frame** - Excluding ghost rendering

**Memory Budget:**
- **Undo stack MUST NOT exceed 30 actions** - Hard limit to prevent memory issues
- **Cache size MUST NOT exceed 10MB** - Monitor cache size in dev mode

**Network Budget:**
- **Prefetch MUST NOT block main thread** - Use requestIdleCallback or setTimeout
- **Max 2 concurrent prefetch requests** - Prevent network congestion

**Enforcement:**
- Add performance markers in dev mode (performance.mark/measure)
- Log warnings when budgets are exceeded (dev only)
- Add React DevTools Profiler checks in development
- Performance budgets are non-negotiable - PRs that exceed budgets MUST be rejected

**Implementation:**
```typescript
// Dev-only performance check
if (process.env.NODE_ENV === 'development') {
  const renderCount = getRenderCount() // From React DevTools Profiler
  if (renderCount > 50) {
    console.warn(`Performance budget exceeded: ${renderCount} components rendered on drag`)
  }
}
```

---

## 16. Future Enhancements (Out of Scope for V1)

- Supabase Realtime integration (hook point designed, not required)
- Offline queue for mutations
- Redo support (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)
- Dragging multiple selected blocks moves all selected
- Collaborative editing indicators
- Advanced snap features (snap to grid, custom snap points)

---

**END OF DOCUMENT**

