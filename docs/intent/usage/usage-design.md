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

Logging and month rollover preserve these rules by construction. The `/api/products` route validates each product it saves against them (see *Product Editor*).

## Month Rollover

When a month ends, each product's current count moves into its history. Rollover runs on the server whenever usage data is loaded — by the home page loader, a GET of `/api/usage`, or before a logging change is applied:

1. Determine the current month (`YYYY-MM`) from the server's local clock.
2. For each record whose `currentMonth` is earlier than the current month: add `usesThisMonth` to `uses[currentMonth]`, set `usesThisMonth` to 0, and set `currentMonth` to the current month.
3. If any record changed, write `usage.json` before returning.

Rollover and logging both change `usage.json` through the data store's per-file update queue (data-store design, *Serialized updates*), so a rollover and a click arriving together never overwrite each other.

A record whose `currentMonth` equals or is later than the current month is left unchanged — rollover only moves counts forward, so a misset clock never rewrites history. Months with no app activity get no `uses` entry; a missing month means zero uses.

**Malformed records.** If any record's `currentMonth` is missing or not in `YYYY-MM` form, loading treats `usage.json` as unreadable — the home page shows its data error and `/api/usage` responds 500 — until the file is fixed. Without a valid month, rollover cannot tell whether a count belongs to an earlier month, and saving any change on top of the record would bury the problem.

If the rollover write fails, loading fails: the home page shows the error page, and `/api/usage` responds 500. Serving rolled-over data that was never saved would show the user history that disappears on the next load.

The server-side function that loads usage data with rollover applied is the only way other segments read `usage.json`.

## Logging a Use

`useUsage()` (`src/features/usage/use-usage.ts`) returns `addUsesToItems(ids)` and `removeUsesFromItems(ids)`. Each call POSTs `{ ids, delta }` to `/api/usage`, where `delta` is `1` or `-1`.

Every click counts: each call sends its own request, and a later click never cancels an earlier request still in flight.

The route action, on the server, inside the `usage.json` update queue:

1. Validates the body's shape (see API).
2. Loads `usage.json` with rollover applied, and checks that every id matches a product.
3. For each product whose `id` is in `ids`, adds `delta` to `usesThisMonth`, but never below 0 — a −1 on a product already at 0 leaves it at 0 while the other products in the request still decrease.
4. Writes `usage.json` once.

After a successful save, `useUsage` revalidates the page's loaders, so the home page re-reads the file and re-renders.

Callers pass a list of ids, so the same hook serves single-product logging (usage table) and multi-product logging (routines segment).

**Save failures.** When the POST responds with an error (400 or 500), or gets no response at all (for example, the server is not running), `useUsage` shows an error notification saying the change was not saved. The page keeps showing the last saved data, since the loader is revalidated only after a successful action.

## Usage Table

`UsageTable` (`src/features/usage/usage-table.tsx`) renders an Add product button above one row per product, with columns: Category, Product, Brand, Overall Uses, This Month's Uses, +/- controls, and an edit button.

- **Sort order** — rows are ordered by the position of their `category` in the concatenation of all category groups, taken in the groups' configured order. Rows with equal position keep file order (stable sort). If `configs.json` has no `categories` key, there are no groups: every row has the same position and the table shows file order.
- **Overall Uses** — sum of all values in `uses`, plus `usesThisMonth`.
- **This Month's Uses** — `usesThisMonth`.

## Product Editor

`ProductDialog` (`src/features/usage/product-dialog.tsx`) is one modal form used for both adding and editing, opened from the usage table. Because it is modal, the +/- controls and routine cards cannot be clicked while it is open.

```
┌─ Edit product ──────────────────┐
│ Name              [___________] │
│ Brand             [___________] │
│ Category          [Foundation ▾]│
│ This month's uses [___]         │  edit only
│              [Cancel]  [Save]   │
└─────────────────────────────────┘
```

**Fields.** Name and brand are required. Category is a dropdown of the configured categories, listed under their groups in configured order, ending with a "New category" option. A new product starts with no history and a current-month count of 0, so this month's uses appears only when editing. Past months are not editable: the +/- controls and this field correct the current month, and closed months stay as recorded. Two products may have the same name and brand, so a repurchase can be tracked separately.

**New categories.** Choosing "New category" reveals a category name input and a group dropdown of the existing groups, ending with a "New group" option that reveals a group name input. A new category goes at the end of its group, and a new group goes after the existing groups, which together set where the category sorts in the usage table.

**Saving.** `useProductEditor()` (`src/features/usage/use-product-editor.ts`) trims the text fields and saves in up to two requests, one at a time:

1. If the category name is new, POST the current categories plus the new one to `/api/configs`, which applies the category rules. If this fails, nothing is saved and step 2 does not run.
2. POST (add) or PUT (edit) the product to `/api/products`.

The category is saved first so that a failure between the two steps leaves at worst an unused category, never a product whose category is not configured. An unused category is valid and appears in the dropdown.

A typed category name that matches a configured category, ignoring capitalization, is treated as that category: the product uses the configured spelling, step 1 is skipped, and the chosen group is ignored. This also makes retrying after a failed step 2 safe. A typed group name that matches an existing group, ignoring capitalization, is treated as that group.

**After saving.** On success the dialog closes and the page's loaders revalidate. On any failure the dialog stays open with its contents, and an error notification shows the server's message, or says the change was not saved if there was no response. If step 1 succeeded and step 2 failed, the loaders still revalidate so the new category appears in the dropdown. Save is disabled while a save is in flight, so a double click cannot add a product twice. Cancel closes the dialog and discards its contents.

**Editing a count.** The form sends `usesThisMonth` only if the user changed it. This way, saving a rename cannot overwrite a logged use the form had not yet seen. A changed count replaces the stored value, because it is a deliberate correction. If the month changes while the dialog is open, a changed count applies to the new month, because the route applies rollover first.

**On the server.** Inside the `usage.json` update queue, the `/api/products` route applies rollover, validates the body against the record rules, and writes the file once:

- **Add** — assigns `id` as the highest existing id plus 1 (0 if there are no products), sets `uses` to `{}`, `currentMonth` to the server's current month, and `usesThisMonth` to 0, and appends the record.
- **Edit** — replaces `name`, `brand`, `category`, and `usesThisMonth` if sent, and leaves `id`, `uses`, and `currentMonth` unchanged.

Routines refer to products by `id`, so renaming a product updates its routine cards without changing `configs.json`. Moving a product to another category leaves the old category configured, even if nothing else uses it.

## Categories

`configs.json → categories` maps a group name (such as `skincare`) to an ordered list of category names (such as `Cleanser`). Groups and categories display in configured order.

**Category rules.** A `categories` value submitted to `/api/configs` is valid when:
- It is an object whose values are arrays of strings. A group's array may be empty, so a group can be set up before it has categories.
- Every group name and category name contains at least one non-whitespace character and neither starts nor ends with whitespace.
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

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/products` | POST | `{ "name", "brand", "category" }` | `null`; product added |
| `/api/products` | PUT | `{ "id", "name", "brand", "category", "usesThisMonth"? }` | `null`; product changed |
| `/api/products` | POST or PUT (invalid) | Body failing validation | 400 with `{ "error": "<message>" }`; file unchanged |
| `/api/products` | POST or PUT (storage failure) | Any | 500 with `{ "error": "<message>" }`; file unchanged |

A `/api/products` body is valid when it has all the required keys for its method and no other keys, `name` and `brand` each contain at least one non-whitespace character and neither starts nor ends with whitespace, and `category` names a configured category. On a PUT, `id` must also match a product's `id`, and `usesThisMonth`, if sent, must be an integer ≥ 0. The error message describes the first failure found.

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
| Product editor placement | Modal dialog opened from the usage table | Inline row editing; separate products page | Keeps one place to manage products, without crowding the table's logging controls or adding the app's first navigation |
| Product write route | New `/api/products` route | Extend `/api/usage` | `/api/usage` carries small logging changes with a strict body; keeping them apart leaves its validation unchanged |
| New category write path | Browser POSTs to `/api/configs`, then saves the product | One `/api/products` request that writes both files | `/api/configs` stays the only write path for categories and reuses their rules. The cost is that the browser coordinates the steps and a failure between them leaves an unused category, which is harmless (*Simplicity over robustness*) |
| New categories and groups in the form | Add and edit can both create a category or group | Dropdown of existing categories only; add form only | Adding or correcting a product never requires a hand edit (HLD *The app is the only writer*) |
| Editable counts | This month's count only | No counts; every month | Typing corrects a large miscount faster than repeated clicks; closed months stay as recorded so cost per use cannot change by accident |
| Count in an edit request | Sent only if changed, as a replacement value | Always sent; sent as a delta | Always sending would let a rename overwrite a use the form had not seen. A replacement matches what the user typed |
| Product ids | Highest existing id plus 1 | Random id; stored counter | Small readable ids; products cannot be deleted, so an id is never reused |
| Capitalization of typed categories and groups | A name differing only by capitalization reuses the existing one | Treat as a new name | `cleanser` and `Cleanser` would otherwise split one category in two, and nothing in the app can merge them |
| Duplicate products | Allowed | Reject a repeated name and brand | A repurchase can be tracked separately |
| Count edit across a month change | Applies to the new month | Reject the save; have the form send its month | Rare for one user, and not worth extra machinery (*Simplicity over robustness*) |

## Open Questions & Future Decisions

### Deferred
1. **Deleting products** — HLD Goal 4 requires deleting products in the app. Not yet designed. It must settle what happens to routines that list the product (routines design, deferred question 2), and whether the highest-id-plus-1 rule can reuse a deleted product's id.
2. **Categories as their own segment** — today categories serve sorting and the record rules; split out if inventory or purchases add category behavior of their own.
3. **Category editor** — HLD Goal 4 requires editing categories in the app. Not yet designed. The product editor can add categories and groups but not rename or remove them, so removing an unused category needs a hand edit until this exists.

## References

- src/features/usage/types.ts
- src/features/usage/use-usage.ts
- src/features/usage/usage.server.ts
- src/features/usage/category-rules.ts
- src/features/usage/usage-table.tsx
- src/features/usage/product-dialog.tsx
- src/features/usage/use-product-editor.ts
- src/app/routes/api.usage.ts
- src/app/routes/api.products.ts
- docs/intent/data-store/data-store-design.md
- docs/arrows/usage.md
