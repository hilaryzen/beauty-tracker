---
parent: high-level-design
prefix: USAGE
---

# Usage

## Context and Design Philosophy

The usage segment is the core of beauty-tracker: one record per product the user owns, with a running count of how often it has been used each month. These counts are the denominator of cost per use (HLD Goal 2) and the "how much do I use it" half of the inventory view (Goal 3), so they must be trustworthy — never negative, never silently lost.

Logging must stay one click (HLD *Low friction over precision*). A click sends only the change — which products, +1 or −1 — and the server applies it to the current file. The client never rewrites the product list.

Usage also owns the category list in `configs.json → categories` and its rules, since categories exist to organize products.

## Product Record

Each product is an `ItemUsage` (`src/features/usage/types.ts`) stored in `usage.json`:

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | Unique product identifier. Records may be in any order; products are always found by `id`, never by array position. |
| `name` | string | Product name |
| `brand` | string | Brand name |
| `category` | string | A category name listed in `configs.json → categories` |
| `uses` | `Record<"YYYY-MM", integer>` | Use counts for closed months, keyed by month |
| `currentMonth` | `"YYYY-MM"` | The month `usesThisMonth` counts |
| `usesThisMonth` | integer | Use count for `currentMonth` |

**Record rules.** Every record in `usage.json` satisfies:
- `id` is an integer, unique across all records.
- `category` names a category present in `configs.json → categories`.
- `usesThisMonth` and every value in `uses` are integers ≥ 0.
- Every key of `uses`, and `currentMonth`, has the form `YYYY-MM`.

Logging and month rollover preserve these rules by construction. A future product editor (HLD Goal 4) validates submitted records against them.

Currently records carry no `currentMonth` field, and `useUsage` addresses records by array index.

## Month Rollover

When a month ends, each product's current count moves into its history. Rollover runs on the server whenever usage data is loaded — by the home page loader, a GET of `/api/usage`, or before a logging change is applied:

1. Determine the current month (`YYYY-MM`) from the server's local clock.
2. For each record whose `currentMonth` is earlier than the current month: add `usesThisMonth` to `uses[currentMonth]`, set `usesThisMonth` to 0, and set `currentMonth` to the current month.
3. If any record changed, write `usage.json` before returning.

Rollover and logging both change `usage.json` through the data store's per-file update queue (data-store design, *Serialized updates*), so a rollover and a click arriving together never overwrite each other.

A record whose `currentMonth` equals or is later than the current month is left unchanged — rollover only moves counts forward, so a misset clock never rewrites history. Months with no app activity get no `uses` entry; a missing month means zero uses.

If the rollover write fails, loading fails: the home page shows the error page, and `/api/usage` responds 500. Serving rolled-over data that was never saved would show the user history that disappears on the next load.

The server-side function that loads usage data with rollover applied is the only way other segments read `usage.json`.

## Logging a Use

`useUsage()` (`src/features/usage/use-usage.ts`) returns `addUsesToItems(ids)` and `removeUsesFromItems(ids)`. Each call POSTs `{ ids, delta }` to `/api/usage`, where `delta` is `1` or `-1`.

Every click counts: each call sends its own request, and a later click never cancels an earlier request still in flight. (A single shared React Router fetcher would cancel the earlier submission, so a rapid double-click might count once.)

The route action, on the server, inside the `usage.json` update queue:

1. Validates the body's shape (see API).
2. Loads `usage.json` with rollover applied, and checks that every id matches a product.
3. For each product whose `id` is in `ids`, adds `delta` to `usesThisMonth`, but never below 0 — a −1 on a product already at 0 leaves it at 0 while the other products in the request still decrease.
4. Writes `usage.json` once.

React Router then revalidates the home loader, which re-reads the file and re-renders.

Callers pass a list of ids, so the same hook serves single-product logging (usage table) and multi-product logging (routines segment).

**Save failures.** When the POST responds with an error (400 or 500), `useUsage` shows an error notification saying the change was not saved. The page keeps showing the last saved data, since the loader is revalidated only after a successful action.

Currently `useUsage` builds the whole updated list on the client and POSTs it, and save failures are not shown.

## Usage Table

`UsageTable` (`src/features/usage/usage-table.tsx`) renders one row per product with columns: Category, Product, Brand, Overall Uses, This Month's Uses, and +/- controls.

- **Sort order** — rows are ordered by the position of their `category` in the concatenation of all category groups, taken in the groups' configured order. Rows with equal position keep file order (stable sort). If `configs.json` has no `categories` key, there are no groups: every row has the same position and the table shows file order.
- **Overall Uses** — sum of all values in `uses`, plus `usesThisMonth`.
- **This Month's Uses** — `usesThisMonth`.

Currently the sort uses only the `skincare`, `makeup`, and `lips` groups, and Overall Uses excludes `usesThisMonth`.

## Categories

`configs.json → categories` maps a group name (such as `skincare`) to an ordered list of category names (such as `Cleanser`). Groups and categories display in configured order.

**Category rules.** A `categories` value submitted to `/api/configs` is valid when:
- It is an object whose values are arrays of non-empty strings. A group's array may be empty, so a group can be set up before it has categories.
- No category name appears more than once across all groups.
- Every category used by a product in `usage.json` is still present.

The data-store segment's `/api/configs` route applies these rules (data-store design, *Configuration API*).

## API

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/usage` | GET | — | Full `ItemUsage[]`, with rollover applied; 500 with `{ "error": "<message>" }` if unreadable |
| `/api/usage` | POST | `{ "ids": [integer, ...], "delta": 1 \| -1 }` | `null`; changes applied |
| `/api/usage` | POST (invalid) | Body failing validation | 400 with `{ "error": "<message>" }`; file unchanged |
| `/api/usage` | POST (storage failure) | Any | 500 with `{ "error": "<message>" }`; file unchanged |

A POST body is valid when `ids` is a non-empty array of distinct integers that each match a product's `id`, `delta` is `1` or `-1`, and there are no other keys. The error message describes the first failure found.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Logging write model | Client sends `{ ids, delta }`; server applies it to the current file inside the per-file update queue | Client sends the whole updated list | Applying the change on the server, one update at a time, means no click is lost to stale data or overlapping requests; only the small request body needs validating |
| Rapid clicks | Every click sends its own uncancelled request | One shared fetcher that cancels in-flight submissions | Each click is a real use; cancellation would make a double-click count once or twice depending on timing |
| Item addressing | Find records by `id` | Array index with `id` = position | Products can be removed or reordered without renumbering routines |
| Count floor | Counts never go below 0; −1 at 0 is a no-op | Allow negatives | The − control is an undo for a mistaken +; negative counts would distort cost per use |
| Monthly history shape | Closed months in `uses`; current month in `usesThisMonth` tagged with `currentMonth` | Single map including current month; lifetime total only | The tag lets the server roll counts over without user action; monthly counts serve the goals (HLD Key Design Decisions) |
| Month rollover | Automatic on load, using the server's local clock | Manual "close month" action | No user action needed (*Low friction over precision*) |
| Rollover write failure | Loading fails with an error | Serve rolled-over data unsaved and retry next load | Unsaved rollover would show history that vanishes on reload |
| Duplicate ids in a logging request | Rejected as invalid | Count each occurrence; count once | No caller has a reason to send one — routines may not list a product twice — so a duplicate signals a bug |
| Overall Uses | Past months plus current month | Closed months only | Matches the real total used so far, which is what cost per use divides by |
| Category groups | Any number of groups, sorted in configured order | Fixed `skincare`, `makeup`, `lips` | New groups (such as hair or body) need no code change |
| Category membership | Product categories must be configured; deleting a category in use is rejected | Free-text categories; allow deleting used categories | Every product stays sortable and groupable for the inventory view |
| Save failure feedback | Error notification; page keeps last saved data | Silent failure; optimistic update with rollback | The user must know a use wasn't recorded; showing saved data needs no rollback logic |

## Open Questions & Future Decisions

### Deferred
1. **Product editing** — HLD Goal 4 requires creating, editing, and deleting products in the app. Not yet designed; expected alongside purchases and inventory. It will validate records against the record rules above.
2. **Categories as their own segment** — today categories serve sorting and the record rules; split out if inventory or purchases add category behavior of their own.

## References

- src/features/usage/types.ts
- src/features/usage/use-usage.ts
- src/features/usage/usage-table.tsx
- src/app/routes/api.usage.ts
- docs/intent/data-store/data-store-design.md
- docs/arrows/usage.md
