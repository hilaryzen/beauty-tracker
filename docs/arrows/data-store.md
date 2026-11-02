# Arrow: data-store

JSON file storage for the app's data, with separate dev and prod data folders.

## Status

**MAPPED** — last audited 2026-10-25 (git SHA `8527123`). All specs implemented with tests.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/data-store/data-store-design.md

### EARS
- docs/intent/data-store/data-store-specs.md (22 specs)

### Tests
- src/utils/files.server.test.ts
- src/app/routes/api.configs.test.ts

### Code
- src/utils/files.server.ts
- src/app/routes/api.configs.ts
- src/assets/data/usage.json
- src/assets/data/configs.json
- src/assets/data-prod/usage.json
- src/assets/data-prod/configs.json
- package.json (`dev:prod`, `start` scripts set `ENV=prod`)

## Architecture

**Purpose:** Read and write the app's two JSON data files (`usage.json`, `configs.json`) from a folder chosen by environment, and expose `configs.json` over HTTP with validation.

**Key Components:**
1. `files.server.ts` — `getDataDir()` (`DATA_DIR`, else `data-prod` when `ENV=prod`, else `data`); `getFile(name)`; `updateFile(name, data)` (atomic temp-file-then-rename, rethrows on failure); `modifyFile(name, change)` (read-change-write, queued per file)
2. `/api/configs` route — GET returns `configs.json`; POST validates `categories` (`features/usage/category-rules.ts`) and `routines` (`features/routine/routine-rules.ts`), then merges the sent keys inside `modifyFile`
3. Data folders — `data/` (development, committed) and `data-prod/` (real data, git-ignored)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Environment | STORE-001, STORE-002, STORE-011 | 3 | 0 | 0 |
| File access | STORE-003 to STORE-010, STORE-012 | 9 | 0 | 0 |
| Config API | STORE-API-001 to STORE-API-010 | 10 | 0 | 0 |

**Summary:** 22 specs, all `[x]`.

## Key Findings

1. **`/api/configs` has no UI caller yet** — it exists for the planned routine and category editors.
