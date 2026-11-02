# Arrow: routines

Named groups of products the user logs together in one click.

## Status

**MAPPED** — last audited 2026-10-25 (git SHA `8527123`). All specs implemented with tests.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/routines/routines-design.md

### EARS
- docs/intent/routines/routines-specs.md (15 specs)

### Tests
- src/features/routine/routine-card.test.tsx
- src/features/routine/routine-rules.test.ts

### Code
- src/features/routine/routine-card.tsx
- src/features/routine/routine-rules.ts
- src/assets/data/configs.json (`routines` key)

## Architecture

**Purpose:** Let the user define routines (e.g. "Morning Skincare", "Makeup") as ordered lists of products, see each routine's products on a card, and log a use for every product in the routine at once.

**Key Components:**
1. `configs.json → routines` — map of routine name to an ordered array of product ids
2. `RoutineCard` — one card per routine with product names looked up by id ("Unknown product (id N)" when none matches) and +/- controls; no cards when routines are empty or missing (`routine-card.tsx`)
3. `useUsage` (usage segment) — logs ±1 for all products in the routine as one `{ ids, delta }` request
4. `checkRoutines` — routine rules applied by `/api/configs` (`routine-rules.ts`)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Definition | ROUT-001 | 1 | 0 | 0 |
| UI | ROUT-UI-001 to ROUT-UI-006 | 6 | 0 | 0 |
| Logging | ROUT-LOG-001 to ROUT-LOG-002 | 2 | 0 | 0 |
| Validation | ROUT-VAL-001 to ROUT-VAL-006 | 6 | 0 | 0 |

**Summary:** 15 specs, all `[x]`.

## Key Findings

1. **No UI to create or edit routines** — routines are hand-edited in `configs.json`; `/api/configs` POST validates them but nothing in the UI calls it yet (LLD deferred question 1).

## Work Required

### Nice to Have
1. Design the routine editor (HLD Goal 4).
