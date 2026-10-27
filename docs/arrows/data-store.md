# Arrow: data-store

JSON file storage for the app's data, with separate dev and prod data folders.

## Status

**MAPPED** — last audited 2026-10-25 (git SHA `8527123`). Brownfield skeleton; behavior observed in code, intent not yet confirmed.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/data-store/data-store-design.md

### EARS
- docs/intent/data-store/data-store-specs.md (20 specs)

### Tests
- none

### Code
- src/utils/files.server.ts
- src/app/routes/api.configs.ts
- src/assets/data/usage.json
- src/assets/data/configs.json
- src/assets/data-prod/usage.json
- src/assets/data-prod/configs.json
- package.json (`dev:prod`, `start` scripts set `ENV=prod`)

## Architecture

**Purpose:** Read and write the app's two JSON data files (`usage.json`, `configs.json`) from a folder chosen by environment, and expose `configs.json` over HTTP.

**Key Components:**
1. `files.server.ts` — `getFile(name)` / `updateFile(name, data)`; selects `assets/data-prod` when `ENV=prod`, else `assets/data` (`files.server.ts:4-5`)
2. `/api/configs` route — whole-file GET/POST over `configs.json` (`api.configs.ts`)
3. Data folders — `data/` (development) and `data-prod/` (real data), both committed to git

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Environment | STORE-001, STORE-002, STORE-011 | 0 | 0 | 3 |
| File access | STORE-003 to STORE-010 | 0 | 0 | 8 |
| Config API | STORE-API-001 to STORE-API-009 | 0 | 0 | 9 |

**Summary:** 20 specs, all `[ ]`. STORE-001 to STORE-006 and STORE-API-001/002 describe behavior observed in code but untested; STORE-007 to STORE-011 and STORE-API-003 to STORE-API-009 describe behavior not yet implemented.

## Key Findings

1. **Prod data is stale** — `data-prod/configs.json` still uses an older shape (`makeupCategories`, no `categories` key), which the usage table cannot read (`usage-table.tsx:15`). Confirmed by the user as stale, pending a later update; not a live production failure.
2. **Read errors are swallowed** — `getFile` logs and returns `undefined` (`files.server.ts:12-14`); callers turn that into a 404.
3. **Write errors are swallowed** — `updateFile` logs and returns normally (`files.server.ts:22-24`), so `/api/usage` and `/api/configs` report success on a failed write.
4. **No validation on write** — any JSON body POSTed to either API route replaces the file.
5. **`/api/configs` is unused** — nothing in the UI calls it.
6. **Wrong route type import** — `api.configs.ts:1` imports `Route` from `./+types/api.usage`.
7. **Prod data lives in the repo** — `data-prod/` is committed; uncommitted edits to data files currently sit in the working tree.

## Work Required

### Must Fix
1. Update `data-prod/configs.json` to the current `categories` shape before next prod use (finding 1).

### Should Fix
2. Decide error-handling intent for findings 2–3.
3. Add tests for `getFile`/`updateFile` and env folder selection.

### Nice to Have
4. Fix the type import in `api.configs.ts`; decide whether `/api/configs` stays.
