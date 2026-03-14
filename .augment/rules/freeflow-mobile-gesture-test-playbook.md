---
alwaysApply: true
---

# Freeflow Mobile Gesture Test Playbook

Viewport must be: 390x844.

Before each test:
- Reload page
- Wait until voice bar status indicator is GREEN
- Wait 2 seconds after load
- Wait 400ms between gestures

## Scenario 1 — Restaurant Open

1. Focus voice bar
2. Type: "Pokaż restauracje w Piekarach Śląskich"
3. Send command
4. Wait until restaurant cards appear
5. Tap CENTER of first visible card (not edge)

Expected:
- Sheet moves to PEEK state
- No full expand
- No bounce animation

## Scenario 2 — Expand Sheet

1. Find sheet handle
2. Swipe UP 180px
3. Wait 800ms

Expected:
- Sheet enters EXPANDED state
- List becomes scrollable

## Scenario 3 — Scroll List

1. Swipe UP inside list 3 times
2. Observe momentum scroll

Expected:
- Native scroll
- Sheet position unchanged

## Scenario 4 — Collapse Handoff

1. Scroll list to top
2. Swipe DOWN 120px

Expected:
- Sheet collapses to PEEK
- Not CLOSED

## Scenario 5 — Flick Close

1. From PEEK swipe DOWN fast 250px

Expected:
- Sheet closes
- Voice bar visible again

## Scenario 6 — Stress Test

1. Rapid swipe up/down 5 times

Expected:
- No stuck dragging state
- No jitter loop
- No double snap

---

## Report Format

After each scenario report:

| Check | Result | Notes |
|---|---|---|
| Gesture conflict detected | PASS / FAIL | |
| Scroll blocking | PASS / FAIL | |
| Snap jitter | PASS / FAIL | |
| Frame drops | PASS / FAIL | |
| Unresponsive regions | PASS / FAIL | |
| Mobile physics inconsistency | PASS / FAIL | |
| Race condition pointer ownership | PASS / FAIL | |
| DOM layer capturing touch | PASS / FAIL | |

---

## Known Code Issues (as of 14.03.2026)

### IslandWrapper.tsx
- VELOCITY_THRESHOLD = 400 px/s — too low, triggers on normal scroll
- SWIPE_THRESHOLD = 50px — too sensitive for stress test
- dragElastic default 0.5 — breaks touch-action: pan-y on children
- onClick guard blocks restaurant-stack: isRestaurantStack=true → onClick never fires

### ContextualIsland.tsx
- handlePointerDown missing event.stopPropagation() — CRITICAL
- RAF stop threshold 0.35px — may never stop on 60Hz (jitter)
- setScrollY in every RAF frame — causes re-render on each frame
- window.pointerup race with Framer pointer capture — stuck draggingRef

### FocusStack.tsx
- wheel listener uses capture: true — blocks parent scroll
- No touch event handlers — relies entirely on Framer drag

---

## Quick Fix Priority

1. CRITICAL: event.stopPropagation() in ContextualIsland handlePointerDown
2. CRITICAL: dragElastic={0} in IslandWrapper motion.div
3. HIGH: VELOCITY_THRESHOLD 400 → 800 in IslandWrapper
4. HIGH: RAF stop threshold 0.35 → 0.5 and 0.04 → 0.1
5. MEDIUM: draggingRef.current = false safety reset in goToIndex
