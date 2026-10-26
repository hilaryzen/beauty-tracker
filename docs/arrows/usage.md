# Arrow: usage

Products the user tracks and their monthly use counts — viewing, logging, and category-sorted display.

## Status

**MAPPED** — last audited 2026-10-25 (git SHA `8527123`). Brownfield skeleton; behavior observed in code, intent not yet confirmed.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/usage/usage-design.md

### EARS
- docs/intent/usage/usage-specs.md (14 specs)

### Tests
- none

### Code
- src/features/usage/types.ts
- src/features/usage/use-usage.ts
- src/features/usage/usage-table.tsx
- src/app/routes/api.usage.ts
- src/assets/data/configs.json (`categories` key — consumed for sort order)

## Architecture

**Purpose:** Hold one record per product (name, brand, category, monthly use history, current-month count), display them in a table sorted by category, and let the user add or remove a use.

**Key Components:**
1. `ItemUsage` type — product record shape (`types.ts:1-8`)
2. `useUsage` hook — computes the incremented/decremented array and POSTs it whole to `/api/usage` (`use-usage.ts:4-33`)
3. `UsageTable` — category-sorted table with per-row +/- controls (`usage-table.tsx:12-52`)
4. `/api/usage` route — whole-file GET/POST over `usage.json` (`api.usage.ts`)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Record | USAGE-001 | 0 | 0 | 1 |
| UI | USAGE-UI-001 to USAGE-UI-005 | 0 | 0 | 5 |
| Logging | USAGE-LOG-001 to USAGE-LOG-005 | 0 | 0 | 5 |
| API | USAGE-API-001 to USAGE-API-003 | 0 | 0 | 3 |

**Summary:** 14 specs, all `[ ]` — behavior observed in code but untested.

## Key Findings

1. **Count can go negative** — `removeUsesFromItems` decrements without a floor (`use-usage.ts:27`). Unclear whether intended.
2. **Items addressed by array index, not id** — `usageCopy[id]` (`use-usage.ts:17,26`) assumes `id === index`; holds in current data.
3. **Rapid clicks can lose updates** — each click rebuilds from loader-provided `usage`; a second submit on the same fetcher before revalidation sends a stale array.
4. **Overall Uses excludes the current month** — sums only `uses` history (`usage-table.tsx:44`).
5. **No month rollover** — nothing moves `usesThisMonth` into `uses["YYYY-MM"]`; appears manual.
6. **Unknown categories sort first** — `indexOf` returns −1 (`usage-table.tsx:19-22`); sort assumes `categories` has exactly `skincare`, `makeup`, `lips` keys (`usage-table.tsx:15`).

## Work Required

### Must Fix
1. Confirm intent for findings 1–5 during flesh-out.

### Should Fix
2. Add tests for `useUsage` and table sort.

### Nice to Have
3. Decide whether categories should split into their own segment once inventory/purchases arrive.
