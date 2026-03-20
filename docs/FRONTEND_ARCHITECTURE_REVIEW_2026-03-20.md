# Frontend Architecture Review - FreeFlow (2026-03-20)

## 1. Executive Summary

Frontend is working feature-wise, but architecture is split across parallel versions of panels, duplicated UI modules, and mixed data access patterns.  
This is the core reason for repeated regressions and "fix loops".

Current classification:
- Product stage: MVP moving toward long-term product.
- Team mode: fast iteration, but without strict canonical boundaries.
- Main risk: high maintenance cost and unstable deploy behavior.

Primary recommendation:
- Freeze new visual experiments for admin/client/business panels.
- Consolidate to one canonical route + one canonical implementation per panel domain.
- Remove legacy paths only after redirect safety window and smoke test gate.

---

## 2. Scope + Assumptions

This review covers frontend architecture and panel strategy, not backend pipeline internals.

Assumptions used:
- We keep current stack (React + Router + Tailwind/CSS + Supabase + backend API).
- We prioritize reliability and release predictability over short-term UI variety.
- We do not redesign visuals in this phase, only architecture and ownership.

---

## 3. Current Inventory (Screen-by-Screen)

## 3.1 Route Inventory (from `src/App.tsx`)

Canonical and alias routes currently mixed:

- `/` -> Home
- `/ui-lab` -> UiLab
- `/business` -> BusinessClientPanel
- `/panel/customer` -> CustomerPanel
- `/panel/business` -> BusinessPanel
- `/panel/business-v2` -> BusinessPanelV2
- `/panel/business-kds`, `/panel/business_kds`, `/business_kds` -> BusinessPanelNew
- `/admin`, `/panel/admin`, `/admin-panel` -> AdminPanel
- `/driver` -> DriverPanel
- `/restaurants`, `/client`, `/panel/client` -> ClientPanel

Observation: routing works, but aliases and parallel panel implementations are too broad.

## 3.2 Primary Panel Files and Size

- `src/pages/AdminPanel.jsx`: 1336 lines
- `src/pages/ClientPanel/ClientPanel.tsx`: 983 lines
- `src/pages/Panel/CustomerPanel.jsx`: 1521 lines
- `src/pages/Panel/BusinessPanel.jsx`: 615 lines
- `src/pages/Panel/BusinessPanelV2.jsx`: 440 lines
- `src/pages/BusinessPanelNew.tsx`: 397 lines
- `src/pages/BusinessClientPanel/BusinessClientPanel.tsx`: 201 lines

Observation: very large files indicate mixed concerns (data fetch + orchestration + rendering + styling in one layer).

## 3.3 Navigation Consistency Risk

`src/ui/MenuDrawer.jsx` includes routes that are not defined in `App.tsx`, for example:
- `/reservations`
- `/order-history`
- `/favorites`
- `/my-taxis`
- `/my-hotels`
- `/profile`
- `/voice-settings`
- `/notifications`
- `/faq`
- `/contact`
- `/dev/*`

Observation: these links should either exist as routes or be hidden/feature-flagged.  
Current state creates dead-end navigation risk in production.

---

## 4. Findings by Severity

## P0 (must fix first)

1. Secret-like token in frontend
- File: `src/lib/businessApi.ts`
- `ADMIN_TOKEN` is hardcoded.
- Risk: security and deploy hygiene.

2. Production debug leakage
- Files: `src/main.tsx`, `src/lib/config.ts`
- Runtime logs and `DEBUG: true` by default.
- Risk: noisy runtime and operational exposure.

3. Multiple active panel implementations for same domain
- Customer: `CustomerPanel` vs `ClientPanel`
- Business: `BusinessPanel`, `BusinessPanelV2`, `BusinessPanelNew`, `BusinessClientPanel`
- Risk: behavioral drift, QA explosion, conflicting fixes.

## P1 (high leverage refactor)

4. Dead/duplicate modules
- `src/components/main.tsx` duplicates entrypoint logic.
- `src/components/DrawerMenu.jsx` appears legacy and not wired in runtime.
- `src/store/ui.ts` duplicates `src/state/ui.ts` and appears unused.
- `src/hooks/useBrainSession.ts` appears not used in active runtime.

5. Data boundary mismatch
- Panels mix direct Supabase calls and backend API calls without clear ownership boundary.
- Risk: inconsistent auth, inconsistent source of truth, harder incident response.

6. Mega-components
- Admin/client/customer files are too large, making regressions likely.

## P2 (stability + UX quality)

7. Styling ownership is fragmented
- Large global CSS (`src/index.css`, `src/pages/Home.css`) plus local panel CSS.
- Risk: side effects and hard-to-reason visual changes.

8. Encoding quality drift
- Visible mojibake in several UI strings.
- Risk: polish quality and user trust.

9. Test coverage mismatch
- Existing tests do not fully protect canonical route behavior.

---

## 5. KEEP / REFACTOR / DEPRECATE Matrix

## KEEP (as strategic base)

- Home + sheet architecture:
  - `src/pages/Home.tsx`
  - `src/components/ContextualIsland.tsx`
  - `src/components/RestaurantSheetContent.tsx`
  - `src/components/sheet/*`
- Admin as single analytics/control panel.
- ClientPanel as canonical customer-facing panel target.
- BusinessPanelNew as canonical KDS target.

## REFACTOR (keep but restructure)

- `src/pages/AdminPanel.jsx` -> split into modules:
  - `features/admin/overview`
  - `features/admin/analytics`
  - `features/admin/system`
  - `features/admin/conversations`
- `src/pages/ClientPanel/ClientPanel.tsx` -> split into:
  - `dashboard`, `orders`, `payments`, `profile`, `settings`.
- `src/ui/MenuDrawer.jsx` -> route map from single config object.
- `src/lib/config.ts` -> env-safe config with production debug disabled.
- `src/lib/businessApi.ts` -> move admin auth to backend; remove frontend token.

## DEPRECATE (move to `legacy/` first, remove only after backup window)

- `src/pages/Panel/CustomerPanel.jsx`
- `src/pages/Panel/BusinessPanelV2.jsx`
- `src/components/DrawerMenu.jsx`
- `src/components/main.tsx`
- `src/store/ui.ts`
- Alias routes after redirect period:
  - `/admin-panel`, `/admin`
  - `/client`, `/restaurants`
  - `/panel/business_kds`, `/business_kds`

---

## 6. Target Frontend Architecture

## 6.1 Module Structure

Proposed folder layout:

```text
src/
  app/
    AppProviders.tsx
    router.tsx
    routeConfig.ts
  features/
    home/
    admin/
    business/
    client/
    driver/
  shared/
    ui/
    layout/
    hooks/
    styles/
    lib/
  state/
    auth/
    cart/
    ui/
```

## 6.2 Routing Contract

Canonical routes:
- `/` home
- `/panel/client`
- `/panel/business`
- `/panel/business-kds`
- `/panel/admin`
- `/panel/driver`

Aliases allowed only as redirects, not duplicated route elements.

## 6.3 Data Access Contract

Rule:
- Operational panels (admin/business/client) read through backend API/BFF.
- Direct Supabase access allowed only for low-risk read paths where auth model is explicit.
- No panel should own both direct Supabase writes and backend orchestration writes for same resource.

## 6.4 State Contract

Single source by concern:
- Auth: `state/auth`
- Cart: `state/CartContext`
- UI chrome: `state/ui`

No parallel stores for same concern.

---

## 7. Analytics Panel Strategy (What State to Leave It In)

Recommended "production baseline" for analytics:

Core tabs:
- Overview
- Orders/Revenue
- Top Restaurants + Top Dishes
- System Health
- Conversations (debug view)

Core KPIs:
- orders
- revenue
- average order value
- latency/health signals

Non-core (move to Labs):
- experiment toggles
- ad-hoc debug cards
- temporary diagnostics not tied to operational actions

Rule:
- If metric has no backend source-of-truth, mark it as "estimated" or remove from main dashboard.

---

## 8. ADR Set (Architecture Decisions)

## ADR-001: One Canonical Panel Per Domain
- Status: Proposed
- Decision: keep only one active implementation for admin, client, business, kds, driver.
- Trade-off: short migration effort now vs major regression reduction later.

## ADR-002: Route Aliases Become Redirects
- Status: Proposed
- Decision: aliases remain only as transitional redirects.
- Trade-off: extra redirect map maintenance vs clear route ownership.

## ADR-003: Data Access Through BFF for Panels
- Status: Proposed
- Decision: panel data flows through backend API contract.
- Trade-off: slightly more backend work vs cleaner auth and observability.

## ADR-004: Modular Feature Boundaries
- Status: Proposed
- Decision: split mega panel files into feature modules with local hooks.
- Trade-off: initial refactor cost vs long-term velocity.

---

## 9. Phased Implementation Plan (No More Loops)

## Phase 0 - Safety Baseline (1-2 days)
- Disable production debug logs.
- Remove hardcoded frontend token.
- Add route-level smoke checks for:
  - `/`
  - `/panel/client`
  - `/panel/business`
  - `/panel/business-kds`
  - `/panel/admin`
  - `/panel/driver`

## Phase 1 - Routing and Navigation Consolidation (2-3 days)
- Introduce `routeConfig.ts` as single source of truth.
- Convert aliases to `<Navigate/>` redirects.
- Menu drawer uses `routeConfig` instead of hardcoded paths.
- Hide unresolved routes behind feature flag.

## Phase 2 - Panel Canonicalization (4-6 days)
- Customer path: keep `ClientPanel`, deprecate `CustomerPanel`.
- Business path: keep `BusinessPanelNew` for KDS and one business panel for owner flow.
- Admin path: keep one panel and split by feature slices.

## Phase 3 - Data Contract Stabilization (3-5 days)
- Move panel fetch logic to shared API layer.
- Normalize error/loading/empty states per module.
- Remove mixed direct writes from panel views.

## Phase 4 - Cleanup and Guardrails (2-3 days)
- Move deprecated files to `src/legacy/` with backup notes.
- Keep legacy backups for minimum two deploy cycles before permanent removal.
- Add CI check: fail on unresolved route references from menu map.
- Add architecture checklist to PR template.

---

## 10.1 Legacy Backup Policy (mandatory)

When deprecating any file:

1. Move file to `src/legacy/` (keep original relative structure when possible).
2. Add backup entry in `docs/legacy/LEGACY_INDEX.md` with:
   - original path
   - new legacy path
   - reason for deprecation
   - migration replacement
   - rollback notes
   - date and commit hash
3. Do not permanently delete before backup window ends and smoke tests stay green.

---

## 11. Operating Checklist (Screen-by-Screen Review)

Use this checklist for each screen before changes:

1. What is the one-sentence purpose?
2. What is the canonical route?
3. What API contract powers it?
4. What are loading/empty/error states?
5. What actions are mission-critical?
6. Keep, refactor, or deprecate?
7. Owner and target date?

This turns "opinion loops" into explicit engineering decisions.

---

## 12. Definition of Done for Architecture Stabilization

- One canonical implementation per panel domain.
- One canonical route per panel domain.
- No hardcoded frontend secrets.
- Production debug logging gated by env.
- Route smoke tests passing in CI.
- Deprecated panel files moved to `legacy/` with backup metadata and removal date.
- Menu navigation references only existing routes.

---

## Final Recommendation

Stop incremental visual tweaks in panel modules until Phases 0-2 are done.  
After architecture consolidation, visual polish will be faster and much safer.
