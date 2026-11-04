# Arrow: usage

Monthly use counts for each product — viewing, logging, and category-sorted display.

## Status

**MAPPED** — last audited 2026-10-25 (git SHA `8527123`). The Add product and edit buttons (USAGE-UI-007 to USAGE-UI-010) are not built; all other specs are implemented with tests.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/usage/usage-design.md

### EARS
- docs/intent/usage/usage-specs.md (40 specs)

### Tests
- src/app/routes/api.usage.test.ts
- src/features/usage/usage.server.test.ts
- src/features/usage/usage-table.test.tsx

### Code
- src/features/usage/use-usage.ts
- src/features/usage/usage.server.ts
- src/features/usage/usage-table.tsx
- src/app/routes/api.usage.ts
- src/app/routes/home.tsx (loader calls `loadUsage`)
- src/assets/data/configs.json (`categories` key — consumed for sort order)

## Architecture

**Purpose:** Own every change to a product's counts (monthly use history, current-month count), display products in a table sorted by category, and let the user add or remove a use. Depends on the products segment for the record and categories.

**Key Components:**
1. `loadUsage` / `rollOver` — the only way other segments read counts from `usage.json`; applies month rollover and saves it through `modifyFile` (`usage.server.ts`)
2. `useUsage` hook — POSTs `{ ids, delta }` with `fetch` per click, revalidates on success, shows an error toast on failure (`use-usage.ts`)
3. `UsageTable` — table sorted by category position across all groups, with per-row +/- controls (`usage-table.tsx`)
4. `/api/usage` route — GET with rollover; POST validates the body, then applies the change by id with a floor at 0 inside the `usage.json` queue (`api.usage.ts`)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Rollover | USAGE-ROLL-001 to USAGE-ROLL-007 | 7 | 0 | 0 |
| UI | USAGE-UI-001 to USAGE-UI-010 | 6 | 0 | 4 |
| Logging | USAGE-LOG-001 to USAGE-LOG-011 | 11 | 0 | 0 |
| API | USAGE-API-001 to USAGE-API-012 | 12 | 0 | 0 |

**Summary:** 40 specs: 36 `[x]`, 4 `[ ]`.

## Key Findings

None open.

## Work Required

### Must Fix
1. Implement the Add product and edit buttons (USAGE-UI-007 to USAGE-UI-010) with the products segment.
