---
parent: high-level-design
prefix: STORE
---

# Data Store

## Context and Design Philosophy

beauty-tracker is a single-user app with a small amount of data, so it stores everything as plain JSON files in the repository rather than in a database. Files are human-readable and hand-editable, which matters because some configuration (categories, routines) has no editing UI and is maintained directly in the file.

The data store owns where the files live, how they are read and written, and the HTTP endpoint for configuration. The shape and meaning of each file belong to the segments that use it: usage owns `usage.json`'s records, routines owns `configs.json → routines`, and usage owns `configs.json → categories`.

## Data Files

| File | Contents | Owning segment for contents |
|---|---|---|
| `usage.json` | Array of product records | usage |
| `configs.json` | `{ categories: { skincare, makeup, lips }, routines: { name: [ids] } }` | usage (`categories`), routines (`routines`) |

## Environment Folders

`src/utils/files.server.ts` resolves a data folder once at module load:

- `ENV=prod` → `src/assets/data-prod/`
- otherwise → `src/assets/data/`

`npm run dev` uses `data/`; `npm run dev:prod` and `npm start` set `ENV=prod`. Both folders are committed to git. `data/` is the working development copy; `data-prod/` holds the user's real data and is updated separately; it is currently stale, in an older `configs.json` shape, and due for an update.

## File Access

| Function | Behavior | On error |
|---|---|---|
| `getFile(name)` | Reads `<folder>/<name>` as UTF-8 and returns the parsed JSON | Logs the error message and returns `undefined` |
| `updateFile(name, data)` | Writes `data` as 2-space-indented JSON to `<folder>/<name>`, replacing the file | Logs the error message and returns normally |

Both functions are server-only (`.server.ts`), so file access never ships to the browser.

## Configuration API

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/configs` | GET | — | Full `configs.json` contents; 404 if unreadable |
| `/api/configs` | POST | Full config object as JSON | `null`; file replaced |

No UI currently calls this endpoint. (The `/api/usage` endpoint is specified by the usage segment.)

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Storage medium | JSON files in the repo | SQLite; hosted database; browser storage | [inferred] Single user, small data, hand-editable, no infrastructure |
| Environment separation | Separate `data/` and `data-prod/` folders chosen by `ENV` | One data folder; env-configured path | [inferred] Lets development clicks run against throwaway data |
| Write model | Replace the whole file on every write | Append log; per-record updates | [inferred] Files are small; simplest correct write |
| Error handling | Log and continue; reads return `undefined` | Throw to caller; return error result | [inferred] Unclear — see Open Questions |

## Open Questions & Future Decisions

### Deferred
1. **Swallowed write errors** — `updateFile` never signals failure, so API routes report success on a failed write. Should writes propagate errors so the UI can tell the user?
2. **No validation** — any JSON POSTed to `/api/usage` or `/api/configs` replaces the file. Validate shape before writing?
3. **`/api/configs` future** — keep for a planned routine/category editor, or remove?
4. **Prod data in git** — `data-prod/` is committed. Intentional backup mechanism, or should real data move out of the repo?
5. **Atomic writes** — a crash mid-`writeFile` could leave a truncated file. Write-to-temp-then-rename?
6. **Wrong type import** — `api.configs.ts` imports its `Route` types from `./+types/api.usage`; harmless today since both routes have the same shape.

## References

- src/utils/files.server.ts
- src/app/routes/api.configs.ts
- src/assets/data/, src/assets/data-prod/
- package.json
- docs/arrows/data-store.md
