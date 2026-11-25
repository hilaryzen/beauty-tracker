---
parent: high-level-design
prefix: PROD
---

# Products

## Context and Design Philosophy

The products segment owns what a product is: its record, the categories that organize products, adding and editing products, and editing categories and their groups in the app (HLD Goal 4). Other segments build on this: usage counts how often a product is used, and routines group products by `id`.

Products does not depend on usage or purchases. It defines every field of the record and the values a new record starts with, but it never changes a count or a purchase on an existing record. Changing counts, including month rollover, belongs to the usage segment; recording a product's purchase belongs to the purchases segment. Editing a product touches only the fields products owns, so it needs neither rollover nor the current counts.

## Product Record

Each product is a `Product` (`src/features/products/types.ts`) stored in `usage.json`:

| Field | Type | Meaning | Changed by |
|---|---|---|---|
| `id` | integer | Unique product identifier. Records may be in any order; products are always found by `id`, never by array position. | Never, once assigned |
| `name` | string | Product name | Products |
| `brand` | string | Brand name | Products |
| `category` | string | A category name listed in `configs.json → categories` | Products |
| `shade` | string, optional | The product's shade or color variant, such as `Berry`. Absent when the product has none | Products |
| `opened` | `"YYYY-MM-DD"`, optional | The day the product was first opened. Absent when not recorded | Products |
| `expires` | `"YYYY-MM-DD"`, optional | The day the product expires. Absent when not recorded | Products |
| `removed` | `"YYYY-MM-DD"`, optional | The day the product was used up, thrown out, or given away. Absent when not recorded | Products |
| `size` | `{ "amount": number, "unit": "oz" \| "fl oz" \| "g" \| "mL" }`, optional | How much product the package holds, such as `{ "amount": 1.7, "unit": "fl oz" }`. Absent when not recorded | Products |
| `rating` | integer, optional | The user's rating of the product, 1 (worst) to 5 (best). Absent when not rated | Products |
| `notes` | string, optional | Free-form notes about the product; may span several lines. Absent when there are none | Products |
| `uses` | `Record<"YYYY-MM", integer>` | Use counts for closed months, keyed by month | Usage |
| `currentMonth` | `"YYYY-MM"` | The month `usesThisMonth` counts | Usage |
| `usesThisMonth` | integer | Use count for `currentMonth` | Usage |
| `purchase` | object, optional | The product's purchase: date, optional store, and price in cents (purchases design, *Purchase Field*). Absent until a purchase is recorded | Purchases |

**Record rules.** Every record in `usage.json` satisfies:
- `id` is an integer, unique across all records.
- `name` and `brand` each contain at least one non-whitespace character and neither starts nor ends with whitespace.
- `category` names a category present in `configs.json → categories`.
- `shade`, when present, contains at least one non-whitespace character and neither starts nor ends with whitespace.
- `opened`, `expires`, and `removed`, when present, are each a real calendar date in `YYYY-MM-DD` form.
- `opened` and `removed`, when present, are no later than the server's current local date. `expires` may be any date.
- `size`, when present, is an object with exactly the keys `amount` and `unit`; `amount` is a finite number greater than 0, and `unit` is one of `oz`, `fl oz`, `g`, and `mL`.
- `rating`, when present, is an integer from 1 to 5.
- `notes`, when present, contains at least one non-whitespace character and neither starts nor ends with whitespace.
- `usesThisMonth` and every value in `uses` are integers ≥ 0.
- Every key of `uses`, and `currentMonth`, has the form `YYYY-MM`.
- `purchase`, when present, satisfies the purchases design's field rules.

The `/api/products` route validates each product it saves against these rules. Logging and month rollover preserve them by construction, and the `/api/purchases` route validates each purchase it records.

## Product Name with Shade

Where a page shows a product's name, it shows the name followed by ` – ` (space, en dash, space) and the shade when the product has one (`Lip Glow – Berry`), all in the same text style as the name, so two shades of one product can be told apart. A product without a shade shows its name alone. `productName()` (`src/features/products/product-name.ts`) builds this text. The usage table, routine cards, purchase list, and purchase dialog's product dropdown show products this way (usage, routines, and purchases designs). Error messages from the server that name a product use its name alone.

## Product Dialog

`ProductDialog` (`src/features/products/product-dialog.tsx`) is one modal form used for both adding and editing. The usage table opens it (usage design, *Usage Table*) and passes it the configured categories. Because it is modal, the +/- controls and routine cards cannot be clicked while it is open.

```
┌─ Edit product ──────────────────┐
│ Name              [___________] │
│ Shade             [___________] │
│ Brand             [___________] │
│ Category          [Foundation ▾]│
│ Date opened       [2026-11-07]  │
│ Date expiring     [__________]  │
│ Date removed      [__________]  │
│ Size              [1.7__] [fl oz ▾]│
│ Rating            [4      ▾]    │
│ Notes             [___________] │
│                   [___________] │
│              [Cancel]  [Save]   │
└─────────────────────────────────┘
```

**Fields.** Name, brand, and category are required. Shade is optional: when editing, it starts with the product's shade, or blank if it has none, and saving with it blank leaves the product with no shade.

Date opened, date expiring, and date removed are optional date pickers (native date inputs), shown after category. Each starts blank when adding; when editing, each starts with the product's date, or blank if it has none, and saving with one blank leaves the product without that date. Date opened and date removed do not offer dates after today's local date; date expiring offers any date. Dates are not checked against each other or against the purchase date: they are entered by hand, often long after the fact, and an odd combination is the user's to fix (*Low friction over precision*).

Size, rating, and notes are optional and shown after the date pickers, in that order. Each starts blank when adding; when editing, each starts with the product's value, or blank if it has none, and saving with it blank leaves the product without it.

- **Size** is an amount text input followed by a unit dropdown offering `oz`, `fl oz`, `g`, and `mL` and no blank option, showing the placeholder `Unit` until one is chosen. The amount accepts digits with an optional decimal point and at most two decimal places (`2`, `1.7`, `.5`, `7.50`); surrounding whitespace is ignored. An amount that does not match this form, or is 0, is marked invalid. When the amount is blank the product has no size, whatever unit is chosen. When editing, the amount starts as the stored number written without trailing zeros (`1.7`).
- **Rating** is a dropdown offering blank, 1, 2, 3, 4, and 5.
- **Notes** is a multi-line text input. Line breaks inside the notes are kept; whitespace at the start and end is trimmed.

Category is a dropdown of the configured categories, listed under their groups in configured order, ending with a "New category" option. Two products may have the same name and brand, so a repurchase can be tracked separately.

**New categories.** Choosing "New category" reveals a new category name input and a group dropdown of the existing groups, ending with a "New group" option that reveals a new group name input. A new category goes at the end of its group, and a new group goes after the existing groups, which together set where the category sorts in the usage table. With no categories configured, the category dropdown offers only "New category" and the group dropdown offers only "New group".

**Saving.** `useProductEditor()` (`src/features/products/use-product-editor.ts`) trims the text fields and saves in up to two requests, one at a time:

1. If the category name is new, POST the current categories plus the new one to `/api/configs`, which applies the category rules. If this fails, nothing is saved and step 2 does not run.
2. POST (add) or PUT (edit) the product to `/api/products`. The request carries `shade` only when the trimmed shade is not blank, each of `opened`, `expires`, and `removed` only when its date picker holds a date, `size` only when the size amount is not blank (as `{ amount, unit }` with the amount as a number), `rating` only when one is chosen, and `notes` only when the trimmed notes are not blank.

The category is saved first so that a failure between the two steps leaves at worst an unused category, never a product whose category is not configured. An unused category is valid and appears in the dropdown.

A typed category name that matches a configured category, ignoring capitalization, is treated as that category: the product uses the configured spelling and step 1 is skipped. While the name matches, the group dropdown shows that category's group and is disabled, and the new group name input is hidden, so the form shows where the product is going and does not offer a choice it would ignore. This also makes retrying after a failed step 2 safe. A typed group name that matches an existing group, ignoring capitalization, is treated as that group.

**After saving.** On success the dialog closes and the page's loaders revalidate. When it has added a product, the dialog then reports the new product's `id`, once the loaders have revalidated, to the component that opened it (`onSaved`), so the purchase form can choose the product it just created. On any failure the dialog stays open with its contents, and an error notification shows the server's message, or says the change was not saved if there was no response or the response carries no message. If step 1 succeeded and step 2 failed, the loaders still revalidate so the new category appears in the dropdown. Save is disabled while a required field is blank or a category or group is not chosen, or while date opened or date removed is after today, or while the size amount is invalid or is filled in with no unit chosen. It is also disabled while a save is in flight, so a double click cannot add a product twice. Save stays enabled when nothing has changed, and sends the request as usual.

**Closing.** Cancel, Esc, and the close control close the dialog and discard its contents. A click outside the dialog does nothing, so a stray click cannot lose what was typed. While a save is in flight the dialog cannot be closed, so the result of the save, including a failure, is seen in context.

**While open.** If the page's loaders revalidate while the dialog is open, such as when a logged use finishes saving, the fields keep what is in them.

Routines refer to products by `id`, so renaming a product updates its routine cards without changing `configs.json`. Moving a product to another category leaves the old category configured, even if nothing else uses it.

## Saving on the Server

Inside one multi-file update holding `configs.json` and `usage.json` (data-store design, *Multi-file updates*), the `/api/products` route validates the body, including that its category is configured, and writes `usage.json` once:

- **Add** — assigns `id` as the highest existing id plus 1 (0 if there are no products), sets `name`, `brand`, `category`, and each of `shade`, `opened`, `expires`, `removed`, `size`, `rating`, and `notes` that the body has, sets `uses` to `{}`, `currentMonth` to the server's current month, and `usesThisMonth` to 0, gives it no `purchase`, appends the record, and responds with the new `id`.
- **Edit** — replaces `name`, `brand`, and `category`; sets each of `shade`, `opened`, `expires`, `removed`, `size`, `rating`, and `notes` to the body's value, or removes it when the body has none; and leaves every other field unchanged.

The route reads and writes records through the data store, not through usage's loader, and applies no rollover. A record that has not rolled over yet rolls over the next time usage data is loaded. Because each write runs in the queues, overlapping adds each see the previous one's record and get different ids, and a category edit cannot remove the product's category between the check and the write.

## Categories

`configs.json → categories` maps a group name (such as `skincare`) to an ordered list of category names (such as `Cleanser`). Groups and categories display in configured order.

**Category rules.** A `categories` value submitted to `/api/configs` is valid when:
- It is an object whose values are arrays of strings. A group's array may be empty, so a group can be set up before it has categories.
- Every group name and category name contains at least one non-whitespace character and neither starts nor ends with whitespace.
- No category name appears more than once across all groups.
- Every category used by a product in `usage.json` is still present.

The data-store segment's `/api/configs` route applies these rules (data-store design, *Configuration API*). Because they require every used category to stay present, a `categories` value sent there can add, remove, reorder, or move categories, or add, rename, or remove groups, but cannot rename a category that a product uses. Renaming a category is done through `/api/categories` (*Renaming a Category*).

Two names *match* when they are equal after trimming and ignoring capitalization, as in the product dialog.

## Category Editor

`CategoryEditor` (`src/features/products/category-editor.tsx`) edits `configs.json → categories` from the settings page (app-shell design, *Settings Page*). The page passes it the configured categories and the product records, which it uses only to count the products in each category.

```
Categories
┌ skincare ──────────────── [Rename] [↑] [↓] [Delete] ┐
│ Cleanser      2 products  [Rename] [↑] [↓] [Move to ▾] [Delete] │
│ Moisturizer   0 products  [Rename] [↑] [↓] [Move to ▾] [Delete] │
│ [New category name______] [Add]                       │
└──────────────────────────────────────────────────────┘
┌ makeup ... ┐
[New group name______] [Add group]
```

**Layout.** One section per group, in configured order. Each section is headed by the group name and lists its categories in configured order, each with the number of products using it (`1 product`, `2 products`, `0 products`). Every group and category has Rename, move-up and move-down, and Delete controls; every category also has a "Move to" dropdown of the other groups. Each section ends with a new category input and Add button, and the list ends with a new group input and Add group button. Pressing Enter in either input does what its button does, when the button is enabled. With no groups configured, only the new group input and button show.

**Edits.** Each edit saves as soon as it is made. Except for renaming a category, each edit builds the full new `categories` value from the configured categories and sends it as a POST to `/api/configs`:

| Edit | New `categories` value |
|---|---|
| Add category | The trimmed name appended to the end of its group |
| Add group | A new empty group with the trimmed name, after the existing groups |
| Rename group | The group's key replaced by the trimmed name, keeping its position and categories |
| Move a category up or down | The category swapped with its neighbor in the same group |
| Move a group up or down | The group swapped with its neighbor |
| Move a category to another group | The category removed from its group and appended to the end of the chosen group |
| Delete category | The category removed from its group |
| Delete group | The group removed |

Renaming a category sends a POST to `/api/categories` with `{ "from": <current name>, "to": <trimmed new name> }`.

**Controls that would break a rule are disabled.** The editor disables:
- Delete on a category that any product uses. Deleting it would orphan those products, and `/api/configs` would reject it.
- Delete on a group that has categories, so a deletion never takes categories with it.
- Move up on the first item of its list, and move down on the last.
- "Move to" while there is no other group.
- Add and Add group while their input is blank after trimming, or while the name matches an existing category or group.

**Renaming.** Rename turns the name into a text input holding the current name, with Save and Cancel. Enter saves and Esc cancels. Save is disabled while the trimmed name is blank, unchanged, or matches a different category (for a category) or a different group (for a group). A rename that changes only capitalization is allowed. Only one rename input is open at a time, and opening another closes the first without saving. The input and its Cancel stay usable while its save is in flight; cancelling then only closes the input, and the request still completes.

**While saving.** While an edit is being saved, every edit control in the editor is disabled, so each edit starts from the categories the previous one saved. When the request finishes, successful or not, the page's loaders revalidate, so the editor shows what was actually saved, including the result of a rename that failed partway. On success the add or rename input that was used is cleared and closed. On failure the typed text stays in the add input, or in the rename input if it is still open, and an error notification shows the server's message, or says the change was not saved if there was no response or the response has no message. No edit asks for confirmation: deleting removes only an unused category or an empty group, and both can be added again.

## Renaming a Category

`/api/categories` renames a category everywhere it appears. Holding the update queues of both `configs.json` and `usage.json` (data-store design, *Multi-file updates*), it reads both files, validates the body, and writes in three steps:

1. Write `configs.json` with the new name inserted directly after the old one, so both are configured.
2. Write `usage.json` with every product that used the old name using the new name. Skipped when no product uses it.
3. Write `configs.json` with the old name removed.

Every step leaves both files satisfying the record and category rules. If a step fails, the route responds 500 and the files keep what the steps before it wrote: at worst the new name is configured alongside the old one and some products already use it. Both names stay valid, and the editor shows them both with their product counts. At least one of them is unused, so its Delete is enabled. If the old name is the unused one, deleting it finishes the rename. If the new name is the unused one, deleting it and renaming again does.

A case-only rename (`cleanser` to `Cleanser`) cannot hold both names at once, because they are duplicates. It writes `configs.json` with the name replaced in place, then `usage.json`. A failure between the two leaves products using a name no longer configured; this is accepted because a capitalization change is rare and the write failures that cause it are rarer (*Simplicity over robustness*).

**Validation.** A body is valid when it is a JSON object with exactly the keys `from` and `to`; `from` is a configured category; `to` satisfies the category name rule; and `to` matches no configured category other than `from`. A `to` equal to `from` is valid and writes nothing. The error message describes the first failure found.

## API

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/products` | POST | `{ "name", "brand", "category", "shade"?, "opened"?, "expires"?, "removed"?, "size"?, "rating"?, "notes"? }` | `{ "id": <new id> }`; product added |
| `/api/products` | PUT | `{ "id", "name", "brand", "category", "shade"?, "opened"?, "expires"?, "removed"?, "size"?, "rating"?, "notes"? }` | `null`; product changed |
| `/api/products` | POST or PUT (invalid) | Body failing validation | 400 with `{ "error": "<message>" }`; file unchanged |
| `/api/products` | POST or PUT (storage failure) | Any | 500 with `{ "error": "<message>" }`; file unchanged |
| `/api/products` | PATCH or DELETE | Any | 405 with `{ "error": "<message>" }`; file unchanged |
| `/api/categories` | POST | `{ "from", "to" }` | `null`; category renamed in `configs.json` and every product using it |
| `/api/categories` | POST (invalid) | Body failing validation | 400 with `{ "error": "<message>" }`; files unchanged |
| `/api/categories` | POST (storage failure) | Any | 500 with `{ "error": "<message>" }`; files keep the steps completed before the failure |
| `/api/categories` | GET, PUT, PATCH, or DELETE | Any | 405 with `{ "error": "<message>" }`; files unchanged |

An `/api/products` body is valid when it is a JSON object with the keys listed for its method and no others, where only `shade`, `opened`, `expires`, `removed`, `size`, `rating`, and `notes` may be left out; `name`, `brand`, and each of the optional keys when present satisfy the record rules; and `category` names a configured category. On a PUT, `id` must also match a product's `id`. The error message describes the first failure found.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Item addressing | Find records by `id` | Array index with `id` = position | Products can be removed or reordered without renumbering routines |
| Starting values for counts | Products sets `uses`, `currentMonth`, and `usesThisMonth` on a new record | Usage fills them in on first load; store counts in a separate file | Keeps products independent of usage and needs no data migration. The cost is that products knows the names of the count fields |
| Queues held by `/api/products` | `configs.json` and `usage.json` | `usage.json` only | The category check reads `configs.json`; without holding it, a category removed or renamed between the check and the write would leave the product in a category that is not configured (HLD *Cross-file writes*) |
| No rollover on product writes | The route applies none | Call usage's rollover first | Calling it would make products depend on usage. Product writes never touch counts, so a record that has not rolled over is still correct |
| Product dialog placement | Modal dialog opened from the usage table | Inline row editing; separate products page | Keeps one place to manage products, without crowding the table's logging controls or adding the app's first navigation |
| Add response | The new product's `id` | `null`, leaving the caller to find the new record | A caller such as the purchase form needs to know which product it created; matching by name fails for duplicate products |
| Product write route | New `/api/products` route | Extend `/api/usage` | `/api/usage` carries small logging changes with a strict body; keeping them apart leaves its validation unchanged |
| One dialog for add and edit | One form, one save flow, one route | Separate adder and editor | They differ only in their starting values, their HTTP method, and how `id` is set; everything else would be written twice |
| New category write path | Browser POSTs to `/api/configs`, then saves the product | One `/api/products` request that writes both files | `/api/configs` stays the only write path for categories and reuses their rules. The cost is that the browser coordinates the steps and a failure between them leaves an unused category, which is harmless (*Simplicity over robustness*) |
| New categories and groups in the form | Add and edit can both create a category or group | Dropdown of existing categories only; add form only | Adding or correcting a product never requires a hand edit (HLD *The app is the only writer*) |
| Product ids | Highest existing id plus 1 | Random id; stored counter | Small readable ids; products cannot be deleted, so an id is never reused |
| Capitalization of typed categories and groups | A name differing only by capitalization reuses the existing one | Treat as a new name | `cleanser` and `Cleanser` would otherwise split one category in two, and nothing in the app can merge them |
| Shade | An optional field of its own | Part of the name; a free-text notes field | Keeps the product name the same across shades of one product, so two shades of it read as the same product in different colors |
| Clearing a shade | A blank Shade field removes `shade` from the record | Keep the stored shade when the field is blank | Otherwise a shade, once set, could never be removed in the app (HLD Goal 4) |
| Shade in requests | Omitted when there is none; a PUT without `shade` removes it | Send `""` or `null` for no shade | A PUT already replaces every field products owns, and an absent key matches an absent field on the record. One rule — any `shade` sent must be a clean name — needs no special values |
| Showing a shade | One format, defined here and built by `productName()`, used wherever a page shows a product | Each segment formats the shade its own way | A product reads the same on every page, and a change to the format is made once |
| Shade in error messages | Left out; a server error names a product by its name alone | Use the name with shade there too | Errors that name a product are rare and cannot come from the app's own forms, so the shade would add nothing a user would see |
| Opened, expiring, and removed dates | Three optional `YYYY-MM-DD` fields on the record, owned by products and edited in the product dialog | Owned by purchases beside the purchase date; a log of dated events per product | They describe the product itself, not what it cost, and are set one product at a time, so they belong with the other fields the product dialog edits. Three named fields are all the usage table needs |
| Date checks | Each date is a real calendar date; opened and removed are no later than today; expiring is any date; dates are not compared with each other or the purchase date | Also require purchase ≤ opened ≤ removed and opened ≤ expiring | Opening or removing in the future is a typo, but an expiry is usually in the future. Cross-date checks would block saves over data entered from memory (*Low friction over precision*) |
| Clearing a date | A blank date picker removes that date from the record, and a request leaves the key out | Keep the stored date; send `null` | Same rule as shade: a date, once set, can be removed in the app, and an absent key matches an absent field |
| Incomplete dates in the dialog | A date picker holding a partly typed date counts as blank | Disable Save while a picker holds an incomplete date | The native picker makes a partial date hard to leave behind, and a missing date is corrected by editing (*Simplicity over robustness*) |
| Malformed dates already stored | A stored date the date picker cannot show, such as `Nov 5`, starts blank, so saving the product removes it | Report the bad value in the dialog; reject the edit | Only a hand edit can store one, as with a partly typed date (*Simplicity over robustness*) |
| Future opened or removed dates already stored | The dialog shows them, and Save stays disabled until they are corrected | Accept them on edit | Only a hand edit can store one, and correcting it in the dialog takes one step |
| Date removed and ownership | Stored and shown only; a removed product still appears and can be logged everywhere | Hide or dim removed products | What "currently owned" means belongs to the inventory design (HLD Goal 3) |
| Size, rating, and notes | Optional fields on the record, owned by products and edited in the product dialog | A free-text size; notes kept in a separate file | They describe the product itself and are set one product at a time, like shade and dates |
| Product cost | No cost field on the product; what a product cost is its `purchase.price` | A list or retail price on the product beside the purchase price | One price per product keeps cost per use unambiguous (HLD *Purchase model*) |
| Size shape | An amount and one of four units: `oz`, `fl oz`, `g`, `mL` | A single free-text string such as `1.7 fl oz`; any unit | A number with a fixed unit can be compared and computed with later; four units cover beauty packaging. `oz` (weight) and `fl oz` (volume) are both offered because labels use both |
| Size amount precision | The dialog accepts at most two decimal places; the server checks only that the amount is a positive finite number | Check decimal places on the server; store the amount in hundredths as an integer | Label sizes have at most two decimals, and the dialog is the only way to enter one. A decimal-place check on a binary number is unreliable, and integer hundredths would make every reader convert (*Simplicity over robustness*) |
| Size amount without a unit | Save is disabled until a unit is chosen; a unit with a blank amount is ignored | Default the unit to `oz`; reject a unit with no amount | A default unit would silently store `oz` for a `fl oz` product. A leftover unit with no amount means no size, so blocking Save over it adds a step for nothing (*Low friction over precision*) |
| Rating scale | Whole numbers 1 to 5, picked from a dropdown with a blank option | Half steps; clickable stars | Five whole steps are enough to tell favorites from duds. A dropdown matches the dialog's other inputs, works from the keyboard, and clears by choosing blank |
| Notes format | One multi-line string, trimmed at the ends, with inner line breaks kept | Single-line text; a list of dated notes | Free-form notes need room for a few lines; dated entries add structure nothing reads |
| Malformed size or rating already stored | A stored size or rating the dialog cannot show, such as `rating: 7` or unit `ml`, starts blank, so saving the product removes it | Report the bad value in the dialog; reject the edit | Only a hand edit can store one, as with malformed dates (*Simplicity over robustness*) |
| Stored size amounts with more than two decimals | The dialog shows the amount as stored, marks it invalid, and keeps Save disabled until it is corrected | Round it on display | Only a direct API call can store one, and correcting it in the dialog takes one step, as with future dates already stored |
| Notes length | No limit | A maximum length | A single user writing their own notes; `usage.json` stays small enough either way (*Simplicity over robustness*) |
| Duplicate products | Allowed | Reject a repeated name and brand | A repurchase can be tracked separately |
| Group for an existing category typed as new | Filled in and locked | Require a group and ignore it; hide the group dropdown | Shows where the product is going without offering a choice that would be ignored |
| Clicking outside the dialog | Does nothing; Cancel, Esc, and the close control close it | Chakra's default of closing on an outside click | A stray click should not lose what was typed |
| Closing during a save | Not allowed | Let the save continue with the dialog gone | A failure is only useful if the form is still there to correct and retry |
| Ids already listed in routines | Not checked when assigning an id | Skip ids that routines list | A routine can list an unknown id only in data that predates the routine rules. A new product could then join that routine; rare, and not worth a check (*Simplicity over robustness*) |
| Malformed months on product writes | Not checked | Reject the write as usage's loader does | The write leaves the bad record as it was, and the home page still reports it, so nothing is hidden |
| Number-only group names | Allowed; they sort before other groups, and the editor's move-up and move-down cannot change their position | Reject them | JavaScript orders integer-like object keys first. Such names are unlikely, as in the routines design |
| Saving a new category from two open tabs | Accepted; the later save can drop the earlier tab's unused category | Merge on the server | `/api/configs` replaces `categories` as a whole, and this needs two tabs open at once for one user (*Simplicity over robustness*) |
| Category groups | Any number of groups, sorted in configured order | Fixed `skincare`, `makeup`, `lips` | New groups (such as hair or body) need no code change |
| Category membership | Product categories must be configured; deleting a category in use is rejected | Free-text categories; allow deleting used categories | Every product stays sortable and groupable for the inventory view |
| Renaming a used category | A dedicated `/api/categories` route renames it in `configs.json` and every product, in one request | Allow renaming only unused categories; the browser chains `/api/configs` and `/api/products` writes | Renaming never needs products moved out first or a hand edit; one server request can hold both files' queues, which the browser cannot |
| Rename write order | Add the new name, move products, remove the old name | Replace the name in `configs.json`, then update products | Every step leaves valid data, so a failure needs no hand edit (HLD *Cross-file writes*) |
| Case-only renames | Replaced in place in two writes, accepting a rare invalid state on failure | Reject case-only renames; rename through a temporary name | Fixing capitalization should be possible in the app; a temporary name adds two writes for a case that almost never fails |
| Editor save model | Each edit saves at once | Edit locally, then Save all | Matches how logging and the product dialog save, and each change gets its own error message |
| Editor write path | Every edit except a category rename sends the full `categories` value to `/api/configs` | A route per edit kind | `/api/configs` already applies the category rules to the whole value; only a rename needs to change products too |
| Reordering control | Move-up and move-down buttons | Drag and drop | Works from the keyboard and needs no drag-and-drop dependency; category lists are short |
| Deleting a group with categories | Disabled until the group is empty | Delete the group and its unused categories together | A deletion never removes more than the one item it names |
| Delete confirmation | None | A confirmation dialog | Only unused categories and empty groups can be deleted, and either can be added again (*Low friction over precision*) |
| Names matching ignoring capitalization | Blocked when adding or renaming to a name that matches another category or group | Allow them | `cleanser` and `Cleanser` would split one category in two, as in the product dialog |
| Merging categories | Not supported; renaming to another category's name is blocked | Renaming into an existing category merges them | Out of scope; a product can be moved to another category one at a time in the product dialog |

## Open Questions & Future Decisions

### Deferred
1. **Deleting products** — HLD Goal 4 requires deleting products in the app. Not yet designed. It must settle what happens to routines that list the product (routines design, deferred question 2), and whether the highest-id-plus-1 rule can reuse a deleted product's id.
2. **Categories as their own segment** — today categories serve sorting and the record rules; split out if inventory or purchases add category behavior of their own.

## References

- src/features/products/types.ts
- src/features/products/category-rules.ts
- src/features/products/product-dialog.tsx
- src/features/products/use-product-editor.ts
- src/features/products/product-name.ts
- src/app/routes/api.products.ts
- src/utils/calendar-date.ts
- src/utils/today.ts
- src/features/products/category-editor.tsx
- src/app/routes/api.categories.ts
- src/utils/send-json.ts
- docs/intent/purchases/purchases-design.md
- src/utils/this-month.ts
- docs/high-level-design.md
- docs/intent/usage/usage-design.md
- docs/intent/data-store/data-store-design.md
- docs/arrows/products.md
