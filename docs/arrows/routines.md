# Arrow: routines

Named groups of products the user logs together in one click.

## Status

**MAPPED** — last audited 2026-10-25 (git SHA `8527123`). Brownfield skeleton; behavior observed in code, intent not yet confirmed.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/routines/routines-design.md

### EARS
- docs/intent/routines/routines-specs.md (15 specs)

### Tests
- none

### Code
- src/features/routine/routine-card.tsx
- src/assets/data/configs.json (`routines` key)

## Architecture

**Purpose:** Let the user define routines (e.g. "Morning Skincare", "Makeup") as ordered lists of products, see each routine's products on a card, and log a use for every product in the routine at once.

**Key Components:**
1. `configs.json → routines` — map of routine name to an ordered array of product ids (`configs.json:27-31`)
2. `RoutineCard` — renders one card per routine with its product names and +/- controls (`routine-card.tsx:11-37`)
3. `useUsage` (usage segment) — reused to apply and persist the ±1 for all products in the routine (`routine-card.tsx:12,22`)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Definition | ROUT-001 | 0 | 0 | 1 |
| UI | ROUT-UI-001 to ROUT-UI-006 | 0 | 0 | 6 |
| Logging | ROUT-LOG-001 to ROUT-LOG-002 | 0 | 0 | 2 |
| Validation | ROUT-VAL-001 to ROUT-VAL-006 | 0 | 0 | 6 |

**Summary:** 15 specs, all `[ ]`. ROUT-UI-003 (lookup by id), ROUT-UI-005, and ROUT-VAL-* describe behavior not yet implemented; the rest are observed in code but untested.

## Key Findings

1. **Products referenced by array index** — `usage[id].name` (`routine-card.tsx:26`); a routine id beyond the usage list crashes the card. Shares the id/index coupling noted in the usage arrow.
2. **No UI to create or edit routines** — routines are hand-edited in `configs.json`; `/api/configs` POST exists but nothing calls it.
3. **Empty card footer** — `Card.Footer` renders with no children (`routine-card.tsx:30-31`); looks like a placeholder.
4. **Routine card and usage table share one fetcher-per-hook pattern** — each component calls `useUsage` separately, so a routine click and a table click are independent submissions computed from the same loader data.

## Work Required

### Must Fix
1. Confirm intent for findings 1–3 during flesh-out.

### Should Fix
2. Add tests for routine card rendering and multi-product logging.

### Nice to Have
3. Decide whether routine editing belongs in the UI.
