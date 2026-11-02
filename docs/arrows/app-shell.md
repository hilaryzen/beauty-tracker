# Arrow: app-shell

Page frame and composition: root layout, theme, error page, routing, the home page, and shared UI controls.

## Status

**MAPPED** — last audited 2026-10-25 (git SHA `8527123`). All specs implemented with tests.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/app-shell/app-shell-design.md

### EARS
- docs/intent/app-shell/app-shell-specs.md (11 specs)

### Tests
- src/app/root.test.tsx
- src/app/root.layout.test.tsx
- src/app/routes/home.test.tsx
- src/app/routes/home.loader.test.ts

### Code
- src/app/root.tsx
- src/app/routes.ts
- src/app/routes/home.tsx
- src/components/add-minus-buttons/main.tsx
- src/components/ui/provider.tsx
- src/components/ui/color-mode.tsx
- src/components/ui/toaster.tsx
- react-router.config.ts, vite.config.ts

## Architecture

**Purpose:** Frame every page (HTML document, fonts, theme provider, error boundary), declare routes, and compose the home page from the usage and routines segments.

**Key Components:**
1. `root.tsx` — HTML layout with the "Beauty Tracker" title and Inter font links; `Shell` (Chakra `Provider` + `<Toaster />`) around every page including the error page; Chakra-styled `ErrorBoundary`
2. `routes.ts` — index route plus `/api/usage` and `/api/configs`
3. `home.tsx` — server loader reads `configs.json` and usage through `loadUsage()`, 500 "Your data could not be loaded." when either is unreadable; renders `RoutineCard` above `UsageTable`
4. `AddMinusButtons` — shared + / − button pair used by the usage table and routine cards (`add-minus-buttons/main.tsx`)
5. `components/ui/*` — Chakra snippets: `provider.tsx` (app system with Inter), `color-mode.tsx` (`ColorModeProvider` only), `toaster.tsx`

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Layout | SHELL-UI-001 to SHELL-UI-004 | 4 | 0 | 0 |
| Home | SHELL-HOME-001, SHELL-HOME-002, SHELL-HOME-004 | 3 | 0 | 0 |
| Error page | SHELL-ERR-001 to SHELL-ERR-004 | 4 | 0 | 0 |

**Summary:** 11 specs, all `[x]`.

## Key Findings

1. **No navigation** — a single page today; a header or nav is needed once purchases or inventory add pages (LLD deferred question 1).

## Work Required

### Nice to Have
1. Add navigation when a second page arrives.
