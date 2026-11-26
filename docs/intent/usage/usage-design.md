---
parent: high-level-design
prefix: USAGE
---

# Usage

## Context and Design Philosophy

The usage segment is the core of beauty-tracker: a running count of how often each product is used each month. The products segment defines the product record and its rules (products design, *Product Record*), and usage owns every change to its count fields: `uses`, `currentMonth`, and `usesThisMonth`. These counts are the denominator of cost per use (HLD Goal 2) and the "how much do I use it" half of the inventory view (Goal 3), so they must be trustworthy — never negative, never silently lost.

Logging must stay one click (HLD *Low friction over precision*). A click sends only the change — which products, +1 or −1 — and the server applies it to the current file. The client never rewrites the product list.

## Month Rollover

When a month ends, each product's current count moves into its history. Rollover runs on the server whenever usage data is loaded — by the home page loader, a GET of `/api/usage`, or before a logging change is applied:

1. Determine the current month (`YYYY-MM`) from the server's local clock.
2. For each record whose `currentMonth` is earlier than the current month: add `usesThisMonth` to `uses[currentMonth]`, set `usesThisMonth` to 0, and set `currentMonth` to the current month.
3. If any record changed, write `usage.json` before returning.

Rollover and logging both change `usage.json` through the data store's per-file update queue (data-store design, *Serialized updates*), so a rollover and a click arriving together never overwrite each other. Both change only the count fields — `uses`, `currentMonth`, and `usesThisMonth`; every other field of a record, including fields other segments own such as `purchase`, is kept as it was.

A record whose `currentMonth` equals or is later than the current month is left unchanged — rollover only moves counts forward, so a misset clock never rewrites history. Months with no app activity get no `uses` entry; a missing month means zero uses.

**Malformed records.** If any record's `currentMonth` is missing or not in `YYYY-MM` form, loading treats `usage.json` as unreadable — the home page shows its data error and `/api/usage` responds 500 — until the file is fixed. Without a valid month, rollover cannot tell whether a count belongs to an earlier month, and saving any change on top of the record would bury the problem.

If the rollover write fails, loading fails: the home page shows the error page, and `/api/usage` responds 500. Serving rolled-over data that was never saved would show the user history that disappears on the next load.

The server-side function that loads usage data with rollover applied is the only way other segments read counts from `usage.json`. The products segment does not use counts, so it reads records through the data store instead.

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

`UsageTable` (`src/features/usage/usage-table.tsx`) renders an Add product button, a row of group tabs, and one row per product shown on the selected tab, with columns: Status, Category, Product, Brand, Size, Cost, Rating, Overall Uses, This Month's Uses, Purchased, Opened, Expires, Removed, +/- controls, and an edit button.

- **Group tabs** — an "All" tab comes first, followed by one tab per category group in `configs.json → categories`, in configured order and labeled with the group name. The "All" tab shows every product. A group's tab shows only the products whose `category` is in that group. A group whose tab has no products shows the message "No products in this group." in place of rows. If `configs.json` has no `categories` key, only the "All" tab is shown.
- **Selected tab in the URL** — the selected group is kept in the page URL's `group` search parameter (for example `/?group=lips`), and the "All" tab is selected when the parameter is absent. Choosing a different group tab sets the parameter to the group name, and choosing "All" from another tab removes it. Each such choice adds a browser history entry, so Back returns to the previous tab. Choosing the tab that is already selected does nothing, so an unrecognized parameter stays in the URL until another tab is chosen. With the keyboard, the arrow keys move focus between tabs without selecting them, and Enter or Space selects the focused tab, so passing over tabs adds no history entries. The header's Usage link points to `/`, so following it shows the "All" tab. Because the selection lives in the URL, it survives the page's loader revalidation after logging a use or saving a product, a page refresh, and returning to the page through a bookmarked link. If the parameter names no configured group (for example, after a group is renamed in `configs.json`), the "All" tab is selected and every product is shown.
- **Scope of the tabs** — the tabs filter only the usage table; the routine cards above it show every routine on every tab.
- **Adding and editing on a group tab** — the Add product button and edit buttons behave the same on every tab: the product dialog opens as it does from "All", with no category chosen when adding. A product saved into a category outside the selected group is saved but no longer shown on that tab; the tab stays selected.
- **Sort order** — rows are ordered first by `status`, in status order (`In Progress`, `Opened`, `Backlog`, `Panned`, `Decluttered`; products design, *Product Status*). A product whose `status` is missing or not one of the five (possible only by a hand edit) sorts after `Decluttered`. Rows with the same status are ordered by the position of their `category` in the concatenation of all category groups, taken in the groups' configured order. Rows with equal status and category position keep file order (stable sort). If `configs.json` has no `categories` key, there are no groups: every row has the same category position, so rows are ordered by status and then file order. Sorting applies on every tab.
- **Status** — the product's `status` as stored (`In Progress`). Empty when the product has no `status`, or one that is not one of the five.
- **Product** — the product's name with its shade (products design, *Product Name with Shade*).
- **Size** — the product's `size` (products design, *Product Record*) as its amount written without trailing zeros, a space, and its unit (`1.7 fl oz`, `50 mL`). Empty when the product has no size, or a size that breaks the products record rules (possible only by a hand edit), matching how the product dialog treats one.
- **Cost** — the product's purchase price (`purchase.price`, purchases design, *Purchase Field*) as US dollars with two decimal places (`$32.00`), the format the purchases page uses (`formatDollars`). `$0.00` for a gift or free sample. Empty when the product has no purchase. The table only shows the price; it is changed on the purchases page.
- **Rating** — the product's `rating` as a bare number (`4`). Empty when the product has no rating, or a rating that is not an integer from 1 to 5.
- **Overall Uses** — sum of all values in `uses`, plus `usesThisMonth`.
- **This Month's Uses** — `usesThisMonth`.
- **Purchased, Opened, Expires, Removed** — the product's purchase date (`purchase.date`, purchases design, *Purchase Field*) and its `opened`, `expires`, and `removed` dates (products design, *Product Record*), each shown as stored, in `YYYY-MM-DD` form. A cell is empty when the product has no such date. The table only shows these dates; they are changed in the product dialog and, for the purchase date, on the purchases page.
- **Add product and edit buttons** — open the products segment's `ProductDialog`, to add a product or to edit that row's product.

## API

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/usage` | GET | — | Full `Product[]`, with rollover applied; 500 with `{ "error": "<message>" }` if unreadable |
| `/api/usage` | POST | `{ "ids": [integer, ...], "delta": 1 \| -1 }` | `null`; changes applied |
| `/api/usage` | POST (invalid) | Body failing validation | 400 with `{ "error": "<message>" }`; file unchanged |
| `/api/usage` | POST (storage failure) | Any | 500 with `{ "error": "<message>" }`; file unchanged |

A POST body is valid when `ids` is a non-empty array of distinct integers that each match a product's `id`, `delta` is `1` or `-1`, and there are no other keys. The error message describes the first failure found.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Logging write model | Client sends `{ ids, delta }`; server applies it to the current file inside the per-file update queue | Client sends the whole updated list | Applying the change on the server, one update at a time, means no click is lost to stale data or overlapping requests; only the small request body needs validating |
| Rapid clicks | Every click sends its own uncancelled request | One shared fetcher that cancels in-flight submissions | Each click is a real use; cancellation would make a double-click count once or twice depending on timing |
| Count floor | Counts never go below 0; −1 at 0 is a no-op | Allow negatives | The − control is an undo for a mistaken +; negative counts would distort cost per use |
| Monthly history shape | Closed months in `uses`; current month in `usesThisMonth` tagged with `currentMonth` | Single map including current month; lifetime total only | The tag lets the server roll counts over without user action; monthly counts serve the goals (HLD Key Design Decisions) |
| Month rollover | Automatic on load, using the server's local clock | Manual "close month" action | No user action needed (*Low friction over precision*) |
| Rollover write failure | Loading fails with an error | Serve rolled-over data unsaved and retry next load | Unsaved rollover would show history that vanishes on reload |
| Duplicate ids in a logging request | Rejected as invalid | Count each occurrence; count once | No caller has a reason to send one — routines may not list a product twice — so a duplicate signals a bug |
| Overall Uses | Past months plus current month | Closed months only | Matches the real total used so far, which is what cost per use divides by |
| Save failure feedback | Error notification; page keeps last saved data | Silent failure; optimistic update with rollback | The user must know a use wasn't recorded; showing saved data needs no rollback logic |
| Usage table filter | Tabs: "All", then one per category group | One tab per category; a category dropdown filter; no filter | Groups match how products are browsed (skincare, makeup, lips) and stay few enough for one row of tabs. A tab per category would make about 20 tabs. The Category column still tells categories apart within a group |
| Where the selected tab lives | The page URL's `group` search parameter | Component state | It survives loader revalidation, refresh, and bookmarks, and Back works. The cost is that choosing a tab reruns the home page loader: cheap for local JSON files, and if a data file cannot be read at that moment, the tab click shows the error page as any other reload would (*Simplicity over robustness*) |
| Keyboard tab selection | Arrow keys move focus; Enter or Space selects | Arrow keys select the tab they reach | Each selection adds a history entry and reruns the loader, so selecting on arrow keys would leave one Back step for every tab passed over |
| Groups with no products | Shown as a tab with an empty-group message | Hidden | The tab row follows `configs.json` exactly, so a new group appears as soon as it is created |
| Product dates in the table | Purchased, Opened, Expires, and Removed columns after the use counts, in `YYYY-MM-DD` form, empty when absent | Before the use counts; `Nov 7, 2026` as on the purchases page | The use counts, which change daily, come before the dates, which rarely change. `YYYY-MM-DD` is compact across four columns and lines up row to row |
| Size, cost, and rating in the table | Size, Cost, and Rating columns after Brand; notes are not shown | After the dates; a Notes column | Size, cost, and rating describe the product, so they sit with its name and brand, and cost beside size lets two products be compared at a glance. Notes run to several lines and would make rows uneven; they are read in the product dialog |
| Cost column | The purchase price, in the purchases page's dollar format | Cost per use; a cost field on the product | The price is the one recorded cost (HLD *Purchase model*); showing it in the same format means it reads the same on both pages |
| Rating display | The bare number (`4`) | Stars (`★★★★☆`); `4/5` | The column header already says what the number means, and a digit is the narrowest cell |
| Status column and sort | Status is the leftmost column, and rows sort by status before category | Status as a filter or tabs; sort by category only | The products in use come first and the ones no longer owned sink to the bottom, so the table reads as what to reach for now; status first matches the column that drives the sort. Group tabs already filter, and a second row of tabs would crowd them |
| Rows with an unrecognized status | Shown with an empty Status cell, sorted after `Decluttered` | Treat the file as unreadable; hide the row | Only a hand edit can store one; the row stays visible and loggable, and editing it fixes it |
| Removed products in the table | Shown and logged like any other product | Hidden or dimmed | What "currently owned" means belongs to the inventory design (HLD Goal 3) |
| Typed count corrections | None; the +/- controls are the only way to change a count | A typed count in the usage table or product dialog | One write path for counts keeps them trustworthy. The cost is that a large miscount takes many clicks. Closed months stay as recorded, so cost per use cannot change by accident |

## References

- src/features/usage/use-usage.ts
- src/features/usage/usage.server.ts
- src/features/usage/usage-table.tsx
- src/features/purchases/money.ts
- src/app/routes/api.usage.ts
- docs/intent/products/products-design.md
- docs/intent/purchases/purchases-design.md
- docs/intent/data-store/data-store-design.md
- docs/arrows/usage.md
