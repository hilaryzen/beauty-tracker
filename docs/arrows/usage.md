# Arrow: usage

Products the user tracks and their monthly use counts — viewing, logging, and category-sorted display.

## Status

**MAPPED** — last audited 2026-10-25 (git SHA `8527123`). All specs implemented with tests.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/usage/usage-design.md

### EARS
- docs/intent/usage/usage-specs.md (41 specs)

### Tests
- src/app/routes/api.usage.test.ts
- src/features/usage/usage.server.test.ts
- src/features/usage/usage-table.test.tsx
- src/features/usage/category-rules.test.ts

### Code
- src/features/usage/types.ts
- src/features/usage/use-usage.ts
- src/features/usage/usage.server.ts
- src/features/usage/usage-table.tsx
- src/features/usage/category-rules.ts
- src/app/routes/api.usage.ts
- src/app/routes/home.tsx (loader calls `loadUsage`)
- src/assets/data/configs.json (`categories` key — consumed for sort order)

## Architecture

**Purpose:** Hold one record per product (name, brand, category, monthly use history, current-month count), display them in a table sorted by category, and let the user add or remove a use.

**Key Components:**
1. `ItemUsage` type — product record shape, including `currentMonth` (`types.ts`)
2. `loadUsage` / `rollOver` — the only way to read `usage.json`; applies month rollover and saves it through `modifyFile` (`usage.server.ts`)
3. `useUsage` hook — POSTs `{ ids, delta }` with `fetch` per click, revalidates on success, shows an error toast on failure (`use-usage.ts`)
4. `UsageTable` — table sorted by category position across all groups, with per-row +/- controls (`usage-table.tsx`)
5. `/api/usage` route — GET with rollover; POST validates the body, then applies the change by id with a floor at 0 inside the `usage.json` queue (`api.usage.ts`)
6. `checkCategories` — category rules applied by `/api/configs` (`category-rules.ts`)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Record | USAGE-001 to USAGE-002 | 2 | 0 | 0 |
| Rollover | USAGE-ROLL-001 to USAGE-ROLL-007 | 7 | 0 | 0 |
| UI | USAGE-UI-001 to USAGE-UI-006 | 6 | 0 | 0 |
| Logging | USAGE-LOG-001 to USAGE-LOG-011 | 11 | 0 | 0 |
| API | USAGE-API-001 to USAGE-API-012 | 12 | 0 | 0 |
| Categories | USAGE-CAT-001 to USAGE-CAT-003 | 3 | 0 | 0 |

**Summary:** 41 specs, all `[x]`.

## Key Findings

None open.

## Work Required

### Nice to Have
1. Decide whether categories should split into their own segment once inventory/purchases arrive.
