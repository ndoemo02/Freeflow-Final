# Legacy Backup Index

Use this file to track every file moved to `src/legacy/`.

## Entry Template

```md
## YYYY-MM-DD - <short title>
- Original path: `<path>`
- Legacy path: `<path>`
- Reason: <why deprecated>
- Replacement: <new canonical file/module>
- Rollback: <how to restore quickly>
- Commit: `<hash>`
```

---

## Active Entries

<!-- Add entries below this line -->

## 2026-03-20 - Legacy drawer component
- Original path: `src/components/DrawerMenu.jsx`
- Legacy path: `src/legacy/components/DrawerMenu.jsx`
- Reason: Duplicate drawer implementation; `src/ui/MenuDrawer.jsx` is canonical runtime drawer.
- Replacement: `src/ui/MenuDrawer.jsx`
- Rollback: Move file back to original path and rewire imports only if canonical drawer regression occurs.
- Commit: `<pending>`

## 2026-03-20 - Duplicate entrypoint backup
- Original path: `src/components/main.tsx`
- Legacy path: `src/legacy/components/main.tsx`
- Reason: Duplicate entrypoint logic; root entrypoint is `src/main.tsx`.
- Replacement: `src/main.tsx`
- Rollback: Move file back only if build tooling is intentionally reconfigured to use component-local entrypoint.
- Commit: `<pending>`

## 2026-03-20 - Duplicate UI store backup
- Original path: `src/store/ui.ts`
- Legacy path: `src/legacy/store/ui.ts`
- Reason: Parallel UI store conflicts with canonical `src/state/ui.ts`.
- Replacement: `src/state/ui.ts`
- Rollback: Restore only if older modules requiring `menuOpen/toggleMenu` are reintroduced.
- Commit: `<pending>`

## 2026-03-20 - Business panel v2 retired
- Original path: `src/pages/Panel/BusinessPanelV2.jsx`
- Legacy path: `src/legacy/pages/Panel/BusinessPanelV2.jsx`
- Reason: Panel Biznesowy v2 removed from active routing/navigation to simplify architecture.
- Replacement: `src/pages/Panel/BusinessPanel.jsx` (`/panel/business`)
- Rollback: Move file back and re-add route/import only if canonical panel regression requires emergency fallback.
- Commit: `<pending>`
