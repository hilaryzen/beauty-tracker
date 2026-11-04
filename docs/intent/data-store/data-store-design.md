---
parent: high-level-design
prefix: STORE
---

# Data Store

## Context and Design Philosophy

beauty-tracker is a single-user app running locally with a small amount of data, so it stores everything as JSON files on disk rather than in a database. The app is the only writer of these files (HLD tenet *The app is the only writer*): every change arrives through an API route that validates it before the data store writes it.

The data store owns where the files live, how they are read and written, and the HTTP endpoint for configuration. The shape and meaning of each file — and the rules for validating it — belong to the segments that use it: products owns `usage.json`'s records and `configs.json → categories`; usage owns changes to the records' count fields; routines owns `configs.json → routines`.

## Data Files

| File | Contents | Owning segment for contents and validation rules |
|---|---|---|
| `usage.json` | Array of product records | products (records), usage (changes to count fields) |
| `configs.json` | `{ categories: { skincare, makeup, lips }, routines: { name: [ids] } }` | products (`categories`), routines (`routines`) |

## Environment Folders

`src/utils/files.server.ts` resolves the data folder on each file access:

- `DATA_DIR` set → that folder (used by tests to run against a temporary folder)
- otherwise `ENV=prod` → `src/assets/data-prod/`
- otherwise → `src/assets/data/`

The `src/assets/...` folders are relative to the folder the server is started from: the project folder, where every npm script runs.

`npm run dev` uses `data/`; `npm run dev:prod` and `npm start` set `ENV=prod`. `data/` is the working development copy and is committed to git; `data-prod/` holds the user's real data and is git-ignored, so it never enters the repository.

## File Access

| Function | Behavior | On error |
|---|---|---|
| `getFile(name)` | Reads `<folder>/<name>` as UTF-8 and returns the parsed JSON | Logs the error message and returns `undefined` |
| `updateFile(name, data)` | Writes `data` as 2-space-indented JSON to a temporary file in `<folder>`, then renames it over `<folder>/<name>` | Logs the error message and rethrows it to the caller; `<folder>/<name>` keeps its previous contents |
| `modifyFile(name, change)` | In the file's update queue, reads `<folder>/<name>`, passes the parsed contents to `change`, and writes what `change` returns the same way `updateFile` does | Rejects if the file cannot be read or written, or if `change` throws; `<folder>/<name>` keeps its previous contents |

**Serialized updates.** Most writes are read-change-write: load the file, change part of it, write it back. Two such updates to the same file that overlap would each start from the same contents, and the later write would erase the earlier change. The data store therefore runs read-change-write updates to a given file one at a time, in the order they arrive, through an in-process queue per file. Every API route and server function that changes a data file goes through this queue. A plain write that replaces a file without reading it first waits in the same queue, so it cannot land in the middle of a read-change-write update and be overwritten by it. Updates to different files do not wait for each other.

These functions are server-only (`.server.ts`), so file access never reaches the browser. They do not validate content; validation happens in the API route, before the file is written.

Reads and writes fail differently on purpose. A failed read is reported by the caller, which knows what to tell the user (API routes respond 500; the home page shows "Your data could not be loaded."), so `getFile` returns `undefined`. A failed write must reach the user — otherwise the UI shows a change that was never saved — so `updateFile` rethrows, and each API route turns the error into a 500 response. Writes are atomic: because the new contents land under a temporary name and replace the target only by rename, a crash or failure mid-write never leaves a truncated data file.

## Configuration API

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/configs` | GET | — | Full `configs.json` contents; 500 with `{ "error": "<message>" }` if unreadable |
| `/api/configs` | POST | Object with `categories`, `routines`, or both | `null`; each key present replaces its current value, absent keys are kept |
| `/api/configs` | POST (invalid) | Body failing validation | 400 with JSON body `{ "error": "<message>" }`; file unchanged |
| `/api/configs` | POST (storage failure) | Any | 500 with JSON body `{ "error": "<message>" }`; file unchanged |

`/api/configs` is the write path for in-app editing of routines and categories (HLD Goal 4). A POST carries only the parts being changed: `categories`, `routines`, or both. Through the `configs.json` update queue, the route reads the current `configs.json`, replaces each key present in the body, keeps the rest, and writes the result.

**Validation.** Before writing, the route validates each key present in the body: `categories` against the products segment's rules, `routines` against the routines segment's rules. Routine validation checks product ids against `usage.json`. A body with any top-level key other than `categories` and `routines` is invalid. The error message describes the first failure found.

**Malformed requests.** A POST body that is not valid JSON, or is JSON but not an object, fails validation like any other bad input: 400 with an error message, file unchanged.

**All-or-nothing.** If any part fails validation, the route responds 400 and writes nothing, so the file never holds a half-valid config. If the route cannot complete because a data file cannot be read or written — `configs.json` for the merge, `usage.json` for routine or category validation, or the final write — it responds 500 and the file is left as it was.

No UI calls the route yet.

The `/api/usage` endpoint, including its validation, is specified by the usage segment, and `/api/products` by the products segment.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Storage medium | JSON files on local disk | SQLite; hosted database; browser storage | Single local user, small data, no infrastructure (HLD Key Design Decisions) |
| Data folder base | The folder the server is started from | Relative to the location of `files.server.ts` | A production build bundles the module into `build/server/`, so a module-relative path points at a folder that does not exist |
| Environment separation | Separate `data/` and `data-prod/` folders chosen by `ENV` | One data folder; env-configured path | [inferred] Lets development clicks run against throwaway data |
| Real data and git | `data-prod/` is git-ignored; `data/` is committed | Commit both folders as a backup | Real data is personal and changes with every logged use; keeping it out of git keeps it out of code history and any pushed remote. Development data is committed so the app runs from a fresh clone |
| Write model | Replace the whole file on every write | Append log; per-record updates | Files are small; simplest correct write (*Simplicity over robustness*) |
| Where validation lives | In each API route, using rules owned by the data's segment; data store does not validate | Central per-file schemas in the data store; form-only validation | HLD Key Design Decisions (*Write validation*) |
| Atomic writes | Write to a temporary file, then rename over the target | Write directly to the target file | The data files hold the entire usage history; a truncated file would lose all of it. The cost is one extra filesystem call, an explicit exception to *Simplicity over robustness* |
| Concurrent updates | Queue read-change-write updates per file, one at a time | Accept rare lost updates; file locks on disk | Overlapping clicks or a rollover during a click would otherwise lose a logged use; a single server process makes an in-memory queue sufficient without a dependency |
| Configuration API | Keep `/api/configs` as the configuration write path | Remove until needed; separate routes per config key | Needed for in-app editing of routines and categories (HLD Goal 4) |
| Invalid config writes | Reject the whole write with 400 and an error message | Save the valid parts; silently drop invalid parts | A partly saved config could leave routines pointing at categories or products that the rejected half defined; the message lets the editor tell the user what to fix |
| Config write granularity | Partial: keys present in the body replace current values, absent keys are kept | Full object only; separate routes per key | A routine editor can send just `routines` without round-tripping categories |
| Unknown config keys | Reject the write | Ignore and drop them | Catches stale shapes (such as an old `makeupCategories` key) instead of silently discarding data |
| Error reporting in validation | First failure found | Every failure | One message is enough to fix and resubmit; simpler (*Simplicity over robustness*) |
| Write failures | `updateFile` rethrows; routes respond 500 | Log and report success | A silently lost write leaves the UI showing data that was never saved, undermining counts that cost per use depends on |
| Read failures | `getFile` logs and returns `undefined`; callers respond 500 | Throw to caller; respond 404 | Each caller words the failure for its audience; a 404 would claim the resource does not exist when the data behind it failed to load |

## Open Questions & Future Decisions

### Deferred
1. **Cross-file consistency** — a config update validates against `usage.json` without holding `usage.json`'s queue, so a product change landing mid-validation could be missed. Harmless while nothing in the app removes a category; revisit when a category editor can.

## References

- src/utils/files.server.ts
- src/app/routes/api.configs.ts
- src/features/products/category-rules.ts
- src/features/routine/routine-rules.ts
- src/assets/data/, src/assets/data-prod/
- package.json
- docs/high-level-design.md
- docs/arrows/data-store.md
