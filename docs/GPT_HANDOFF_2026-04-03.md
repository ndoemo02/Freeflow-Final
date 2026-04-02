# GPT Handoff - Frontend Status (2026-04-03)

## Scope Completed
- Mobile/navigation cleanup for consumer + client panel flow
- Live cart behavior fixes (no auto-open on add-to-cart)
- Cart return/context restore improvements
- Client profile save wiring + cart prefill from profile
- Drawer structure updates (consumer-first)
- Targeted UTF-8/mojibake cleanup in critical cart UI texts

## Key Behavioral Contracts Now
1. `add_item_to_cart` does **not** auto-open cart.
2. Cart opens only on explicit intents/tools (show cart/checkout/proceed).
3. Closing cart/checkout restores meaningful previous surface (`restaurant` or `list`).
4. `/orders` resolves to real orders section (`/panel/client?section=orders`).
5. Notification bell and orders entry points are aligned to same destination.
6. On `/panel/client`, app-level BottomTabBar is hidden; panel-local mobile nav is used.
7. Client panel profile form is connected to real save (`supabase.auth.updateUser`).
8. Cart pre-fills delivery data from user profile metadata and requires explicit checkbox confirmation before submit.

## Notable Files Touched
- `src/hooks/useActionDispatcher.ts`
- `src/hooks/useLiveEvents.ts`
- `src/components/Cart.jsx`
- `src/pages/Home.tsx`
- `src/pages/Home.css`
- `src/components/VoiceDock.tsx`
- `src/components/ContextualIsland.tsx`
- `src/components/RestaurantSheetContent.tsx`
- `src/components/BottomTabBar.tsx`
- `src/ui/MenuDrawer.jsx`
- `src/pages/ClientPanel/ClientPanel.tsx`
- `src/state/auth.tsx`
- `src/app/routeConfig.ts`
- `src/App.tsx`

## Current Known Residual Risk / Deferred
- Small mobile viewport visual leak/overlap around lower translucent layer is deferred for full layout redesign (`UI-004`, low priority).
- Large bundle warning remains (`vite` chunk-size warning) - not addressed in this patch set.

## Manual Regression Checklist
1. Voice ordering: find nearby -> show menu -> add item -> cart should stay closed.
2. Explicit "show cart" / checkout request should open cart.
3. Closing cart from checkout should restore menu/list context.
4. Client panel mobile:
   - panel-local bottom nav visible,
   - drawer has `Home` entry and returns to `/`.
5. Profile section:
   - edit/save profile,
   - refresh and verify persistence.
6. Cart form:
   - prefilled from profile,
   - submit blocked until confirmation checkbox checked,
   - clear cart actually clears and does not instantly repopulate from stale UI store.

## Build Status
- `npm run build` (frontend): PASS.
