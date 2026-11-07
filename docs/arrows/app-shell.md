# Arrow: app-shell

Page frame and composition: root layout, theme, error page, routing, navigation header, the home and purchases pages, and shared UI controls.

## Status

**MAPPED** — last audited 2026-10-25 (git SHA `8527123`); sampled 2026-11-07. All specs implemented with tests.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/app-shell/app-shell-design.md

### EARS
- docs/intent/app-shell/app-shell-specs.md (21 specs)

### Tests
- src/app/root.test.tsx
- src/app/root.layout.test.tsx
- src/app/navigation.test.tsx
- src/app/routes/home.test.tsx
- src/app/routes/home.loader.test.ts

### Code
- src/app/root.tsx
- src/app/routes.ts
- src/app/routes/home.tsx
- src/app/routes/purchases.tsx
- src/components/app-header/main.tsx
- src/components/add-minus-buttons/main.tsx
- src/components/ui/provider.tsx
- src/components/ui/color-mode.tsx
- src/components/ui/toaster.tsx
- react-router.config.ts, vite.config.ts

## Architecture

**Purpose:** Frame every page (HTML document, fonts, theme provider, navigation header, error boundary), declare routes, compose the home page from the usage and routines segments, and hold the purchases page placeholder.

**Key Components:**
1. `root.tsx` — HTML layout with the "Beauty Tracker" title, the app meta description, and Inter font links; `Shell` (Chakra `Provider` + `AppHeader` + `<Toaster />`) around every page including the error page; Chakra-styled `ErrorBoundary`
2. `routes.ts` — index route, `/purchases`, plus `/api/usage`, `/api/products`, and `/api/configs`
3. `home.tsx` — server loader reads `configs.json` and usage through `loadUsage()`, 500 "Your data could not be loaded." when either is unreadable; renders `RoutineCard` above `UsageTable`
3a. `purchases.tsx` — placeholder page: heading "Purchases" and "Purchase tracking is coming soon."
3b. `AppHeader` — "Beauty Tracker" plus Usage and Purchases `NavLink`s; the current path's link gets `aria-current="page"` and a bolder style (`app-header/main.tsx`)
4. `AddMinusButtons` — shared + / − button pair used by the usage table and routine cards (`add-minus-buttons/main.tsx`)
5. `components/ui/*` — Chakra snippets: `provider.tsx` (app system with Inter), `color-mode.tsx` (`ColorModeProvider` only), `toaster.tsx`

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Layout | SHELL-UI-001 to SHELL-UI-005 | 5 | 0 | 0 |
| Navigation | SHELL-NAV-001 to SHELL-NAV-008 | 8 | 0 | 0 |
| Home | SHELL-HOME-001, SHELL-HOME-002 | 2 | 0 | 0 |
| Purchases page | SHELL-PURCH-001, SHELL-PURCH-002 | 2 | 0 | 0 |
| Error page | SHELL-ERR-001 to SHELL-ERR-004 | 4 | 0 | 0 |

**Summary:** 21 specs, all `[x]`.

## Key Findings

1. **Purchases page is a placeholder** — real content waits on a purchases segment, which the HLD has not designed yet.

## Work Required

### Nice to Have
1. Add an Inventory header link when inventory gets a page (LLD deferred question 1).
