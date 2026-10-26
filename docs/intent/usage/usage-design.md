---
parent: high-level-design
prefix: USAGE
---

# Usage

## Context and Design Philosophy

The usage segment is the core of beauty-tracker: one record per product the user owns, with a running count of how often it has been used. The user logs a use with a single click, and the home page shows every product in a table so they can see what they reach for and what sits idle.

The current design favors simplicity over robustness: the full product list is held in one JSON file, the client computes the new list, and the server replaces the file wholesale.

## Product Record

Each product is an `ItemUsage` (`src/features/usage/types.ts`):

| Field | Type | Meaning |
|---|---|---|
| `id` | number | Product identifier. In current data, equal to the record's array index. |
| `name` | string | Product name |
| `brand` | string | Brand name |
| `category` | string | One of the category names listed in `configs.json → categories` |
| `uses` | `Record<"YYYY-MM", number>` | Use counts for past months, keyed by month |
| `usesThisMonth` | number | Use count for the current month |

The record list lives in `usage.json` (see the data-store segment for location and environment switching).

## Logging a Use

`useUsage(usage)` (`src/features/usage/use-usage.ts`) returns `addUsesToItems(ids)` and `removeUsesFromItems(ids)`. Each call:

1. Shallow-copies the current list (the loader-provided `usage` prop).
2. For each id, replaces `list[id]` with a copy whose `usesThisMonth` is ±1.
3. POSTs the entire list as JSON to `/api/usage` via a React Router fetcher.

The route action writes the list to `usage.json`; React Router then revalidates the home loader, which re-reads the file and re-renders.

Callers pass a list of ids, so the same hook serves single-product logging (usage table) and multi-product logging (routines segment).

## Usage Table

`UsageTable` (`src/features/usage/usage-table.tsx`) renders one row per product with columns: Category, Product, Brand, Overall Uses, This Month's Uses, and +/- controls.

- **Sort order** — rows are ordered by the position of their `category` in the concatenation `categories.skincare ++ categories.makeup ++ categories.lips`. Rows with equal position keep file order (stable sort).
- **Overall Uses** — sum of all values in `uses`. Does not include `usesThisMonth`.
- **This Month's Uses** — `usesThisMonth` as stored.

## API

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/usage` | GET | — | Full `ItemUsage[]`; 404 if file unreadable |
| `/api/usage` | POST | Full `ItemUsage[]` as JSON | `null`; file replaced |

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Update granularity | Client sends entire list; server overwrites file | Per-item PATCH endpoint; server-side increment | [inferred] Simplest possible write path for a single-user app with small data |
| Item addressing | Array index (`list[id]`) | Find by `id` field | [inferred] Works while ids are assigned sequentially and never removed |
| Monthly history shape | Past months in `uses` map; current month in separate `usesThisMonth` field | Single map including current month | [inferred] Current-month counter is cheap to increment without computing the month key |
| Category sort source | Fixed concatenation of `skincare`, `makeup`, `lips` lists | Iterate all keys of `categories`; per-item sort index | [inferred] Mirrors the three category groups present in config |

## Open Questions & Future Decisions

### Deferred
1. **Negative counts** — decrementing has no floor; `usesThisMonth` can go below 0. Intended as an "undo" with a floor at 0, or deliberately unbounded?
2. **Lost updates on rapid clicks** — each submit is computed from the last loader data; a second click before revalidation overwrites the first. Acceptable for single-user use, or should logging be server-side increments?
3. **Month rollover** — nothing moves `usesThisMonth` into `uses["YYYY-MM"]` when a month ends. Is rollover a manual edit by design, or missing?
4. **Overall Uses excludes current month** — intended ("completed months only") or an oversight?
5. **Unknown or extra categories** — a product whose category is not in any list sorts first; a fourth category group in config is ignored by the sort.
6. **Id/index coupling** — deleting or reordering records would break logging and routine references. Should lookup move to the `id` field?
7. **Categories as their own segment** — today categories only drive sort order; split out if inventory or purchases begin to use them.

## References

- src/features/usage/types.ts
- src/features/usage/use-usage.ts
- src/features/usage/usage-table.tsx
- src/app/routes/api.usage.ts
- docs/arrows/usage.md
