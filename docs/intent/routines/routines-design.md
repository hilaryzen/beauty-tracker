---
parent: high-level-design
prefix: ROUT
---

# Routines

## Context and Design Philosophy

Most product use happens as part of a routine — a morning skincare sequence, a full makeup look. Logging each product individually after every routine is tedious, so a routine bundles products and logs a use for all of them in one click (HLD *Low friction over precision*). A routine always logs every product in it; if one was skipped that day, the user corrects it afterward from the inventory table.

Routines own only the grouping and its rules. Recording and saving a use belongs to the usage segment; routines call into it.

## Routine Definition

Routines are defined in `configs.json` under the `routines` key:

```json
"routines": {
  "Morning Skincare": [4, 5],
  "Makeup": [0, 1, 3, 8, 9],
  "Evening Skincare": [6, 7]
}
```

- **Key** — the routine's display name. Object keys make names unique.
- **Value** — ordered array of product ids, each matching a product record's `id` field (products segment, PROD-002).
- **Order** — routines display in object key order; products within a routine display in array order. JavaScript orders integer-like keys (such as `"2"`) before all other keys, so a routine named with a whole number displays ahead of the rest.
- A product may appear in more than one routine.

**Routine rules.** A `routines` value submitted to `/api/configs` is valid when:
- It is an object whose values are arrays of integers. An empty object is valid: no routines.
- Every routine name contains at least one non-whitespace character and neither starts nor ends with whitespace.
- Every routine lists at least one product.
- No routine lists the same product id more than once.
- Every listed id matches a product record in `usage.json`.

The data-store segment's `/api/configs` route applies these rules (data-store design, *Configuration API*). Routines are created and changed in the routine editor (*Routine Editor*).

## Routine Editor

`RoutineEditor` (`src/features/routine/routine-editor.tsx`) edits `configs.json → routines` from the settings page (app-shell design, *Settings Page*). The page passes it the configured routines, the configured categories, and the product records. It uses the products to name each routine's products and to fill the product dropdowns, and the categories to group those dropdowns.

```
Routines
┌ Morning Skincare ─────────── [Rename] [↑] [↓] [Delete] ┐
│ 1. Cleanser                       [↑] [↓] [Remove]     │
│ 2. Moisturizer – Light            [↑] [↓] [Remove]     │
│ [Add product… ▾]                                       │
└────────────────────────────────────────────────────────┘
┌ Makeup ... ┐
[New routine name______] [First product… ▾] [Add routine]
```

**Layout.** One section per routine, in the order routine cards use (*Routine Definition*, *Order*). Each section is headed by the routine name and lists its products in order, numbered from 1, named with their shades (products design, *Product Name with Shade*). A listed id with no matching product shows as "Unknown product (id N)", as on routine cards. Every routine has Rename, move-up, move-down, and Delete controls; every listed product has move-up, move-down, and Remove controls. Each section ends with an "Add product" dropdown, and the editor ends with a new routine name input, a "First product" dropdown, and an Add routine button. Pressing Enter in the new routine name input does what Add routine does, when it is enabled. With no routines configured, only the new routine controls show.

**Product dropdowns.** Both product dropdowns leave out finished products — those whose status is `Panned` or `Decluttered` (products design, *Product Status*) — and list the rest under one option group per category, in configured order: groups in configured order, and categories in their group's order. A category with no products to list is left out. A product whose category is not configured — possible only after a category rename that failed partway (products design, *Renaming a Category*) — is listed under an option group named for its category, after the configured categories' groups; these groups follow the order in which their categories first appear in `usage.json`. Within any option group, products keep their order in `usage.json`. Each option shows the product's name with its shade. A repurchased product is a separate product record with the same name and shade, so when two or more options in one dropdown would show the same text, each of those with a purchase also shows its purchase date as ` (bought Nov 7, 2026)`, in the purchase list's date format (purchases design). Options with unique text, and colliding options without a purchase, show no date. A section's "Add product" dropdown also leaves out products already in that routine; while it has no product to list, the dropdown is disabled. The "First product" dropdown lists every product that is not finished; a product chosen there stays listed even if it becomes finished while chosen, as when the page's loaders revalidate. A finished product already in a routine stays in the routine's list with its move and Remove controls, and is still logged by the routine's card.

**Edits.** Each edit saves as soon as it is made. Each builds the full new `routines` value from the configured routines and sends it as a POST to `/api/configs` with only the `routines` key:

| Edit | New `routines` value |
|---|---|
| Add routine | A routine with the trimmed name and the chosen first product, after the existing routines |
| Rename routine | The routine's key replaced by the trimmed name, keeping its position and products |
| Move a routine up or down | The routine swapped with its neighbor |
| Delete routine | The routine removed |
| Choose a product in "Add product" | The product appended to the end of that routine |
| Move a product up or down | The product swapped with its neighbor in the same routine |
| Remove a product | That entry removed from the routine; when it is the routine's only entry, the routine removed |

Choosing a product in "Add product" saves at once; the dropdown then returns to its "Add product…" prompt.

**Controls that would break a rule are disabled.** The editor disables:
- Move up on the first item of its list, and move down on the last.
- Add routine while the trimmed name is blank, while it matches an existing routine name ignoring capitalization and surrounding whitespace, or while no first product is chosen.

**Renaming.** Rename behaves as it does in the category editor (products design, *Category Editor*): the name becomes a text input holding the current name, with Save and Cancel; Enter saves and Esc cancels. Save is disabled while the trimmed name is blank, unchanged, or matches another routine's name ignoring capitalization and surrounding whitespace. A rename that changes only capitalization is allowed. Only one rename input is open at a time, and opening another closes the first without saving. The input and its Cancel stay usable while its save is in flight.

**While saving.** Saving behaves as in the category editor. While an edit is being saved, every edit control in the editor is disabled, so each edit starts from the routines the previous one saved. When the request finishes, successful or not, the page's loaders revalidate. On success the new routine inputs or the rename input that was used are cleared and closed. On failure the typed text and chosen first product stay, and an error notification shows the server's message, or says the change was not saved if there was no response or the response has no message. No edit asks for confirmation: a deleted routine can be added again.

**Routines from older data.** A routine that breaks a routine rule — possible only in data that predates the rules — makes every save fail validation, because each save sends every routine. The server's message names the routine and the rule. Removing an unknown product, or deleting the routine, saves a value that passes.

## Routine Cards

`RoutineCard` (`src/features/routine/routine-card.tsx`) receives the usage list and the routines map from the home loader and renders a horizontal row of cards, one per routine. Each card shows:

```
┌──────────────────────────────┐
│ Morning Skincare   [+] [-]   │
│ 1. Blush product name        │
│ 2. Brows product name        │
└──────────────────────────────┘
```

- Title: routine name.
- Controls: + and −, from the shared `AddMinusButtons` component (app-shell segment).
- Body: ordered list of product names with their shades (products design, *Product Name with Shade*), looked up by `id` in the usage list.

A listed id with no matching product — possible only in data that predates the routine rules — is shown as "Unknown product (id N)" so the card still renders. Logging that routine then fails usage validation (USAGE-API-007) as a whole, so none of its products are logged, and usage's save-error notification appears.

With no routines configured — an empty `routines` object, or no `routines` key in `configs.json` — no cards are shown.

## Logging a Routine

The + control calls the usage segment's `addUsesToItems(productIds)` with the routine's full id array; − calls `removeUsesFromItems(productIds)`. The usage segment applies the ±1 to each product (never below 0) and saves the change in one request.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Where routines are stored | `configs.json`, alongside categories | Own file; inside `usage.json` | [inferred] Routines are user configuration rather than tracked data |
| How a routine refers to products | Array of product ids, looked up by `id` | Product names; array positions | Ids stay valid when products are renamed or reordered |
| Logging mechanism | Reuse usage's `useUsage` hook with the routine's id list | Routine-specific endpoint | One save path for all use logging, so the 0 floor, update queue, and error notification apply uniformly |
| Granularity of a routine log | All products in the routine, together | Per-product checkboxes within a routine | One-click logging is the point of a routine (*Low friction over precision*) |
| Empty routines | Rejected | Allowed, with controls hidden | A routine with no products has nothing to log |
| Duplicate products in a routine | Rejected | Count each occurrence | Using a product twice in one routine is not a real case; a duplicate signals an editing mistake |
| Integer-like routine names | Allowed; they display first, and the routine editor's move controls cannot move them | Reject them; store routines as an array | Such names are unlikely; not worth a rule or a format change |
| Unknown product id on a card | Show "Unknown product (id N)" | Fail the home page | One bad id should not hide the rest of the page |
| Routine editor saving | Each edit saves at once; a new routine is added with its name and first product together | Edit a draft per routine and save it with a button | Matches the category editor, so both editors on the settings page behave alike. Adding a first product with the name keeps every saved routine non-empty |
| Removing a routine's only product | Removes the routine | Disable Remove on the only product | One control covers emptying a routine; an empty routine is not allowed, so removing its last product means the routine is gone |
| Products whose category is not configured | Listed in option groups after the configured categories | Left out of the product dropdowns | Such products are still real products that may be in use; hiding them would block adding them to routines until the category is fixed |
| Removing a product listed twice (older data) | Remove takes out only the entry it belongs to | Remove takes out every entry with that id | Each row's controls act on that row, as moves do; either choice makes the routine valid again |
| Telling repurchased products apart | Add the purchase date to options whose text would otherwise collide | Accept identical options; always show the purchase date; show the product id | A repurchase copies the name and shade, so the purchase date is what tells the bottles apart. Showing it only on collisions keeps other options short. Two colliding products with no purchase still look alike; such duplicates are rare |
| Finished products in a routine | Kept in the routine's list and logged by its card; only the dropdowns leave them out | Remove them from routines automatically; mark them in the list | Changing a routine is the user's choice, made with Remove; a status change should not silently change what a routine logs |
| Picking a product | A dropdown with one option group per category | A type-to-search combobox | A native dropdown is simple, and grouping by category shortens the scan; search is worth it only with many more products |
| Routine name matching | New and renamed routine names must differ from other routines ignoring capitalization and surrounding whitespace | Only exact duplicates rejected, as `/api/configs` does | Two routines differing only in capitalization would look the same on routine cards; matches the category editor's rule. The check is in the editor only, since such names break no data rule |
| Routine editor and category editor | Separate components | One generic editor for named, ordered lists | Their edits differ (move-to and a rename API for categories; product dropdowns for routines); sharing would add configuration without removing much code |

## Open Questions & Future Decisions

### Deferred
1. **Deleting a product listed in a routine** — once products can be deleted, deleting such a product would break the routine's logging. The products segment must either block the deletion or remove the product from routines.

## References

- src/features/routine/routine-card.tsx
- src/features/routine/routine-editor.tsx
- src/features/routine/routine-rules.ts
- src/assets/data/configs.json
- docs/intent/products/products-design.md
- docs/intent/usage/usage-design.md
- docs/intent/data-store/data-store-design.md
- docs/arrows/routines.md
