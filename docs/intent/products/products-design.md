---
parent: high-level-design
prefix: PROD
---

# Products

## Context and Design Philosophy

The products segment owns what a product is: its record, the categories that organize products, and adding and editing products in the app (HLD Goal 4). Other segments build on this: usage counts how often a product is used, and routines group products by `id`.

Products does not depend on usage. It defines every field of the record and the values a new record starts with, but it never changes a count on an existing record. Changing counts, including month rollover, belongs to the usage segment. Editing a product touches only the fields products owns, so it needs neither rollover nor the current counts.

## Product Record

Each product is a `Product` (`src/features/products/types.ts`) stored in `usage.json`:

| Field | Type | Meaning | Changed by |
|---|---|---|---|
| `id` | integer | Unique product identifier. Records may be in any order; products are always found by `id`, never by array position. | Never, once assigned |
| `name` | string | Product name | Products |
| `brand` | string | Brand name | Products |
| `category` | string | A category name listed in `configs.json → categories` | Products |
| `uses` | `Record<"YYYY-MM", integer>` | Use counts for closed months, keyed by month | Usage |
| `currentMonth` | `"YYYY-MM"` | The month `usesThisMonth` counts | Usage |
| `usesThisMonth` | integer | Use count for `currentMonth` | Usage |

**Record rules.** Every record in `usage.json` satisfies:
- `id` is an integer, unique across all records.
- `name` and `brand` each contain at least one non-whitespace character and neither starts nor ends with whitespace.
- `category` names a category present in `configs.json → categories`.
- `usesThisMonth` and every value in `uses` are integers ≥ 0.
- Every key of `uses`, and `currentMonth`, has the form `YYYY-MM`.

The `/api/products` route validates each product it saves against these rules. Logging and month rollover preserve them by construction.

## Product Dialog

`ProductDialog` (`src/features/products/product-dialog.tsx`) is one modal form used for both adding and editing. The usage table opens it (usage design, *Usage Table*) and passes it the configured categories. Because it is modal, the +/- controls and routine cards cannot be clicked while it is open.

```
┌─ Edit product ──────────────────┐
│ Name              [___________] │
│ Brand             [___________] │
│ Category          [Foundation ▾]│
│              [Cancel]  [Save]   │
└─────────────────────────────────┘
```

**Fields.** Name, brand, and category are required. Category is a dropdown of the configured categories, listed under their groups in configured order, ending with a "New category" option. Two products may have the same name and brand, so a repurchase can be tracked separately.

**New categories.** Choosing "New category" reveals a category name input and a group dropdown of the existing groups, ending with a "New group" option that reveals a group name input. A new category goes at the end of its group, and a new group goes after the existing groups, which together set where the category sorts in the usage table. With no categories configured, the category dropdown offers only "New category" and the group dropdown offers only "New group".

**Saving.** `useProductEditor()` (`src/features/products/use-product-editor.ts`) trims the text fields and saves in up to two requests, one at a time:

1. If the category name is new, POST the current categories plus the new one to `/api/configs`, which applies the category rules. If this fails, nothing is saved and step 2 does not run.
2. POST (add) or PUT (edit) the product to `/api/products`.

The category is saved first so that a failure between the two steps leaves at worst an unused category, never a product whose category is not configured. An unused category is valid and appears in the dropdown.

A typed category name that matches a configured category, ignoring capitalization, is treated as that category: the product uses the configured spelling and step 1 is skipped. While the name matches, the group dropdown shows that category's group and is disabled, and the group name input is hidden, so the form shows where the product is going and does not offer a choice it would ignore. This also makes retrying after a failed step 2 safe. A typed group name that matches an existing group, ignoring capitalization, is treated as that group.

**After saving.** On success the dialog closes and the page's loaders revalidate. On any failure the dialog stays open with its contents, and an error notification shows the server's message, or says the change was not saved if there was no response or the response carries no message. If step 1 succeeded and step 2 failed, the loaders still revalidate so the new category appears in the dropdown. Save is disabled while a required field is blank or a category or group is not chosen. It is also disabled while a save is in flight, so a double click cannot add a product twice. Save stays enabled when nothing has changed, and sends the request as usual.

**Closing.** Cancel, Esc, and the close control close the dialog and discard its contents. A click outside the dialog does nothing, so a stray click cannot lose what was typed. While a save is in flight the dialog cannot be closed, so the result of the save, including a failure, is seen in context.

**While open.** If the page's loaders revalidate while the dialog is open, such as when a logged use finishes saving, the fields keep what is in them.

Routines refer to products by `id`, so renaming a product updates its routine cards without changing `configs.json`. Moving a product to another category leaves the old category configured, even if nothing else uses it.

## Saving on the Server

Inside the `usage.json` update queue (data-store design, *Serialized updates*), the `/api/products` route validates the body and writes the file once:

- **Add** — assigns `id` as the highest existing id plus 1 (0 if there are no products), sets `uses` to `{}`, `currentMonth` to the server's current month, and `usesThisMonth` to 0, and appends the record.
- **Edit** — replaces `name`, `brand`, and `category`, and leaves every other field unchanged.

The route reads and writes records through the data store, not through usage's loader, and applies no rollover. A record that has not rolled over yet rolls over the next time usage data is loaded. Because each write runs in the queue, overlapping adds each see the previous one's record and get different ids.

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
| `/api/products` | POST | `{ "name", "brand", "category" }` | `null`; product added |
| `/api/products` | PUT | `{ "id", "name", "brand", "category" }` | `null`; product changed |
| `/api/products` | POST or PUT (invalid) | Body failing validation | 400 with `{ "error": "<message>" }`; file unchanged |
| `/api/products` | POST or PUT (storage failure) | Any | 500 with `{ "error": "<message>" }`; file unchanged |

A body is valid when it is a JSON object with exactly the keys listed for its method, `name` and `brand` satisfy the record rules, and `category` names a configured category. On a PUT, `id` must also match a product's `id`. The error message describes the first failure found.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Item addressing | Find records by `id` | Array index with `id` = position | Products can be removed or reordered without renumbering routines |
| Starting values for counts | Products sets `uses`, `currentMonth`, and `usesThisMonth` on a new record | Usage fills them in on first load; store counts in a separate file | Keeps products independent of usage and needs no data migration. The cost is that products knows the names of the count fields |
| No rollover on product writes | The route applies none | Call usage's rollover first | Calling it would make products depend on usage. Product writes never touch counts, so a record that has not rolled over is still correct |
| Product dialog placement | Modal dialog opened from the usage table | Inline row editing; separate products page | Keeps one place to manage products, without crowding the table's logging controls or adding the app's first navigation |
| Product write route | New `/api/products` route | Extend `/api/usage` | `/api/usage` carries small logging changes with a strict body; keeping them apart leaves its validation unchanged |
| One dialog for add and edit | One form, one save flow, one route | Separate adder and editor | They differ only in their starting values, their HTTP method, and how `id` is set; everything else would be written twice |
| New category write path | Browser POSTs to `/api/configs`, then saves the product | One `/api/products` request that writes both files | `/api/configs` stays the only write path for categories and reuses their rules. The cost is that the browser coordinates the steps and a failure between them leaves an unused category, which is harmless (*Simplicity over robustness*) |
| New categories and groups in the form | Add and edit can both create a category or group | Dropdown of existing categories only; add form only | Adding or correcting a product never requires a hand edit (HLD *The app is the only writer*) |
| Product ids | Highest existing id plus 1 | Random id; stored counter | Small readable ids; products cannot be deleted, so an id is never reused |
| Capitalization of typed categories and groups | A name differing only by capitalization reuses the existing one | Treat as a new name | `cleanser` and `Cleanser` would otherwise split one category in two, and nothing in the app can merge them |
| Duplicate products | Allowed | Reject a repeated name and brand | A repurchase can be tracked separately |
| Group for an existing category typed as new | Filled in and locked | Require a group and ignore it; hide the group dropdown | Shows where the product is going without offering a choice that would be ignored |
| Clicking outside the dialog | Does nothing; Cancel, Esc, and the close control close it | Chakra's default of closing on an outside click | A stray click should not lose what was typed |
| Closing during a save | Not allowed | Let the save continue with the dialog gone | A failure is only useful if the form is still there to correct and retry |
| Ids already listed in routines | Not checked when assigning an id | Skip ids that routines list | A routine can list an unknown id only in data that predates the routine rules. A new product could then join that routine; rare, and not worth a check (*Simplicity over robustness*) |
| Malformed months on product writes | Not checked | Reject the write as usage's loader does | The write leaves the bad record as it was, and the home page still reports it, so nothing is hidden |
| Number-only group names | Allowed; they sort before other groups | Reject them | JavaScript orders integer-like object keys first. Such names are unlikely, as in the routines design |
| Saving a new category from two open tabs | Accepted; the later save can drop the earlier tab's unused category | Merge on the server | `/api/configs` replaces `categories` as a whole, and this needs two tabs open at once for one user (*Simplicity over robustness*) |
| Category groups | Any number of groups, sorted in configured order | Fixed `skincare`, `makeup`, `lips` | New groups (such as hair or body) need no code change |
| Category membership | Product categories must be configured; deleting a category in use is rejected | Free-text categories; allow deleting used categories | Every product stays sortable and groupable for the inventory view |

## Open Questions & Future Decisions

### Deferred
1. **Deleting products** — HLD Goal 4 requires deleting products in the app. Not yet designed. It must settle what happens to routines that list the product (routines design, deferred question 2), and whether the highest-id-plus-1 rule can reuse a deleted product's id.
2. **Category editor** — HLD Goal 4 requires editing categories in the app. Not yet designed. The product dialog can add categories and groups but not rename or remove them, so removing an unused category needs a hand edit until this exists.
3. **Categories as their own segment** — today categories serve sorting and the record rules; split out if inventory or purchases add category behavior of their own.

## References

- src/features/products/types.ts
- src/features/products/category-rules.ts
- src/features/products/product-dialog.tsx
- src/features/products/use-product-editor.ts
- src/app/routes/api.products.ts
- docs/high-level-design.md
- docs/intent/usage/usage-design.md
- docs/intent/data-store/data-store-design.md
- docs/arrows/products.md
