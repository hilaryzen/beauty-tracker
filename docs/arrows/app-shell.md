# Arrow: app-shell

Page frame and composition: root layout, theme, error page, routing, the home page, and shared UI controls.

## Status

**MAPPED** — last audited 2026-10-25 (git SHA `8527123`). Brownfield skeleton; behavior observed in code, intent not yet confirmed.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/app-shell/app-shell-design.md

### EARS
- docs/intent/app-shell/app-shell-specs.md (8 specs)

### Tests
- none

### Code
- src/app/root.tsx
- src/app/app.css
- src/app/routes.ts
- src/app/routes/home.tsx
- src/components/add-minus-buttons/main.tsx
- src/components/ui/provider.tsx
- src/components/ui/color-mode.tsx
- src/components/ui/toaster.tsx
- src/components/ui/tooltip.tsx
- react-router.config.ts, vite.config.ts

## Architecture

**Purpose:** Frame every page (HTML document, fonts, theme provider, error boundary), declare routes, and compose the home page from the usage and routines segments.

**Key Components:**
1. `root.tsx` — HTML layout, Inter font links, Chakra `Provider`, `ErrorBoundary` (`root.tsx:14-80`)
2. `routes.ts` — index route plus `/api/usage` and `/api/configs` (`routes.ts:3-7`)
3. `home.tsx` — server loader reads `configs.json` and `usage.json`; renders `RoutineCard` above `UsageTable` (`home.tsx:19-35`)
4. `AddMinusButtons` — shared + / − button pair used by the usage table and routine cards (`add-minus-buttons/main.tsx`)
5. `components/ui/*` — Chakra-generated snippets: provider + color mode (used), toaster, tooltip, color-mode button (unused)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Layout | SHELL-UI-001 to SHELL-UI-002 | 0 | 0 | 2 |
| Home | SHELL-HOME-001 to SHELL-HOME-002 | 0 | 0 | 2 |
| Error page | SHELL-ERR-001 to SHELL-ERR-004 | 0 | 0 | 4 |

**Summary:** 8 specs, all `[ ]` — behavior observed in code but untested.

## Key Findings

1. **Starter page metadata** — page title is "New React Router App" with description "Welcome to React Router!" (`home.tsx:6-11`).
2. **Unused generated components** — `toaster.tsx`, `tooltip.tsx`, and `ColorModeButton` / `LightMode` / `DarkMode` in `color-mode.tsx` are never imported outside `components/ui/`.
3. **No way to switch color mode** — theme follows the system preference via next-themes; no toggle is rendered.
4. **Home loader duplicates API read logic** — `readFromFile` (`home.tsx:13-17`) re-implements the 404-on-missing behavior of the API route loaders rather than sharing it.
5. **Two styling systems** — Tailwind (`app.css`, error boundary classes) and Chakra (all feature components) are both active.

## Work Required

### Must Fix
1. Confirm intent for findings 1–3 during flesh-out.

### Should Fix
2. Add tests for home loader composition and error boundary.

### Nice to Have
3. Decide whether to keep or delete unused `components/ui/*` snippets; decide on one styling system.
