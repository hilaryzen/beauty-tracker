# Arrow: usage

Monthly use counts for each product — month rollover and logging a use.

## Status

**MAPPED** — last audited 2026-10-25 (git SHA `8527123`). All specs implemented with tests.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/usage/usage-design.md

### EARS
- docs/intent/usage/usage-specs.md (30 specs)

### Tests
- src/app/routes/api.usage.test.ts
- src/features/usage/usage.server.test.ts
- src/features/usage/use-usage.test.tsx

### Code
- src/features/usage/use-usage.ts
- src/features/usage/usage.server.ts
- src/app/routes/api.usage.ts
- src/app/routes/home.tsx (loader calls `loadUsage`)

## Architecture

**Purpose:** Own every change to a product's counts (monthly use history, current-month count), leaving every other field of the record as it was, and provide the logging hook the inventory table and routine cards call. Depends on the products segment for the record type.

**Key Components:**
1. `loadUsage` / `rollOver` — the only way other segments read counts from `usage.json`; applies month rollover and saves it through `modifyFile` (`usage.server.ts`)
2. `useUsage` hook — POSTs `{ ids, delta }` with `fetch` per click, revalidates on success, shows an error toast on failure (`use-usage.ts`)
3. `/api/usage` route — GET with rollover; POST validates the body, then applies the change by id with a floor at 0 inside the `usage.json` queue (`api.usage.ts`)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Rollover | USAGE-ROLL-001 to USAGE-ROLL-008 | 8 | 0 | 0 |
| Logging | USAGE-LOG-003 to USAGE-LOG-012 | 10 | 0 | 0 |
| API | USAGE-API-001 to USAGE-API-012 | 12 | 0 | 0 |

**Summary:** 30 specs, all `[x]`.

## Key Findings

None open.
