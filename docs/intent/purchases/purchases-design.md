---
parent: high-level-design
prefix: PURCH
---

# Purchases

## Context and Design Philosophy

The purchases segment records what each product cost (HLD *Approach*): the date a product was bought, the store, and the price paid. Purchases are the price half of cost per use; usage supplies the other half.

Each product record is bought at most once (HLD *Purchases per product*), so a product's purchase is stored on the product record itself, in its `purchase` field. The products segment defines that field as part of the record; the purchases segment owns its rules and is the only segment that changes it, as usage is for the count fields.

A purchase as the user sees it — one shopping trip — is the set of products with the same purchase date and store. Adding a purchase sets the `purchase` field on each product in it, in one write. Editing a purchase replaces it as a whole: its date and store apply to every product in it, and products can be added to it or taken off it. Deleting a purchase removes the `purchase` field from every product in it, so each can be bought again.

A product already tracked, such as one bought before the app existed, can still be given its purchase: the purchase form offers every product that has none. Buying the same item again means adding a new product record from the purchase form.

Purchases depends on products and not on usage. It opens the products segment's product dialog to create a product during a purchase.

## Purchase Field

A product record's `purchase` field, when present, is a `ProductPurchase` (`src/features/purchases/types.ts`):

```json
{
  "id": 3,
  "name": "Positive Light Liquid Luminizer",
  "brand": "Rare Beauty",
  "category": "Highlighter",
  "uses": { "2026-10": 2 },
  "currentMonth": "2026-11",
  "usesThisMonth": 1,
  "purchase": { "date": "2026-11-07", "store": "Sephora", "price": 3200 }
}
```

| Field | Type | Meaning |
|---|---|---|
| `purchase` | object, optional | The product's purchase; absent until one is recorded |
| `purchase.date` | `"YYYY-MM-DD"` | The day it was bought |
| `purchase.store` | string, optional | Where it was bought; absent when no store was entered |
| `purchase.price` | integer | The price paid, in cents |

**Field rules.** Every `purchase` written by the app satisfies:
- `date` is a real calendar date in `YYYY-MM-DD` form, no later than the server's current local date.
- `store`, when present, contains at least one non-whitespace character and neither starts nor ends with whitespace.
- `price` is an integer ≥ 0. A price of 0 records a gift or free sample.
- It has no keys other than `date`, `store`, and `price`.

Prices are whole cents so that totals add exactly. All amounts are US dollars.

## Purchases Page Content

The app shell's purchases page (`/purchases`) shows its heading, then `PurchaseList` (`src/features/purchases/purchase-list.tsx`):

```
Purchases
[Add purchase]

┌──────────────────────────────────────────────┐
│ Nov 7, 2026 · Sephora      $32.00   [Edit]   │
│   Rare Beauty Positive Light Liquid… $32.00  │
│   Saie Glow Sculpt Cream Highlight…   $0.00  │
├──────────────────────────────────────────────┤
│ Oct 30, 2026               $18.50   [Edit]   │
│   Glow Recipe Blueberry Bounce…      $18.50  │
└──────────────────────────────────────────────┘
```

- An "Add purchase" button opens the purchase dialog to add a purchase.
- Each purchase has an "Edit" button, labeled for assistive technology with the purchase's date and store (`Edit purchase Nov 7, 2026 · Sephora`), that opens the purchase dialog to edit that purchase.
- Products with a `purchase` are grouped into purchases: products whose purchase has the same `date` and the same `store` (or no store) form one purchase. Store names match exactly.
- Purchases are listed newest first by date. Purchases on the same date are listed by store name in alphabetical order, ignoring capitalization, with the purchase that has no store last.
- Each purchase shows its date as month abbreviation, day, and year (`Nov 7, 2026`), its store when it has one, its total (the sum of its products' prices), and each product's brand, name with its shade (products design, *Product Name with Shade*), and price, in product `id` order.
- Amounts show as US dollars with two decimal places (`$32.00`).
- With no product purchases recorded, the list shows "No purchases yet."

## Purchase Dialog

`PurchaseDialog` (`src/features/purchases/purchase-dialog.tsx`) is a modal form for adding a purchase or editing one. Except where this section says otherwise, it behaves the same way for both.

```
┌─ Add purchase ─────────────────────────────────┐
│ Date   [2026-11-07]    Store  [_____________]  │
│ Items                                          │
│ [Choose a product        ▾]  $ [_______]  [✕]  │
│ [Add item]                                     │
│ Total $0.00                                    │
│                            [Cancel]  [Save]    │
└────────────────────────────────────────────────┘
```

**Fields.**
- **Date** — a date input, required. Dates after today cannot be chosen.
- **Store** — optional text, suggesting the stores already used on purchases.
- **Items** — "Add item" appends another empty item. Each item has a remove control, disabled while it is the only item.
- **Product** (per item) — a dropdown of the products that can be bought and are not chosen on another item of this form. When adding, those are the products with no `purchase` that are not finished (status `Panned` or `Decluttered`; products design, *Product Status*). When editing, they are those products plus every product the purchase had when the dialog opened, even if it is finished, so a product removed from an item can be chosen again before saving. Products are listed in a section per category, labeled with the category name, ordered by group and then by category in configured order; a category with no product to list has no section. Each product is shown as brand then name with its shade (products design, *Product Name with Shade*). Products whose category is not configured are listed last, under "Other". A product chosen on this item stays listed for it, even if it has since become finished, such as a new product saved as `Panned` from "New product". The dropdown ends with a "New product" option.
- **Price** (per item) — a text input for dollars, accepting digits with an optional decimal point and at most two decimal places (`32`, `32.`, `32.5`, `32.50`, `.99`). A leading `$` and surrounding whitespace are ignored. A price that does not match this form is marked invalid.
- **Total** — the sum of the valid prices entered, updated as prices are typed.

**Adding.** Opened from "Add purchase", the dialog is titled "Add purchase" and starts with today's local date, an empty store, and one empty item.

**Editing.** Opened from a purchase's "Edit" button, the dialog is titled "Edit purchase" and starts with that purchase's date, its store (empty when it has none), and one item per product in it, in product `id` order, each with its price in dollars with two decimal places (`32.00`). The dialog also shows a Delete button.

```
┌─ Edit purchase ────────────────────────────────┐
│ Date   [2026-11-07]    Store  [Sephora______]  │
│ Items                                          │
│ [Rare Beauty Positive Light…▾] $ [32.00] [✕]   │
│ [Saie Glow Sculpt…          ▾] $ [0.00 ] [✕]   │
│ [Add item]                                     │
│ Total $32.00                                   │
│ [Delete]                   [Cancel]  [Save]    │
└────────────────────────────────────────────────┘
```

Saving replaces the purchase: every product on an item gets the dialog's date, store, and its item's price; every product the purchase had when the dialog opened that is on no item loses its purchase. A purchase edited to the same date and store as another purchase shows merged with it in the list, because purchases are grouped by date and store.

**Deleting.** Delete opens a confirmation over the edit dialog asking "Delete this purchase?", saying that its products will have no purchase, with Delete and Cancel buttons. Confirming removes the purchase from every product it had when the dialog opened. Cancel, Esc, and the close control close the confirmation and leave the edit dialog open with its contents; a click outside it does nothing; while the delete is in flight, its Cancel, Esc, and close control are ignored. Delete is disabled while a save or delete is in flight.

**New product.** Choosing "New product" on an item opens the product dialog (products design, *Product Dialog*) over the purchase dialog, to add a product. When the product saves, the product dialog closes and the new product is chosen on that item. When the product dialog is closed without saving, the item keeps the product it had before "New product" was chosen. The new product is saved even if the purchase is never saved.

**Saving.** `usePurchaseEditor()` (`src/features/purchases/use-purchase-editor.ts`) trims the store and prices and sends one request to `/api/purchases`: a POST when adding, a PUT when editing, whose body also lists, as `replaces`, the ids of the products the purchase had when the dialog opened. A blank store is omitted from the body. Each price is converted to whole cents. Deleting sends one DELETE whose body lists those same ids as `productIds`.

Save is disabled while any item has no product, any price is blank or invalid, the date is empty or after today, or a save or delete is in flight.

**After saving or deleting.** On success the dialog (and the confirmation, when deleting) closes and the page's loaders revalidate, so the list shows the change. On any failure the dialog stays open with its contents, the confirmation closes, and an error notification shows the server's message, or says the change was not saved if there was no response or the response carries no message.

**Closing.** Cancel, Esc, and the close control close the dialog and discard its contents; a click outside does nothing; while a save or delete is in flight the dialog cannot be closed — the same rules, for the same reasons, as the product dialog. While the product dialog is open over it, Esc and outside clicks act on the product dialog only.

**While open.** If the page's loaders revalidate while the dialog is open, its fields keep their contents, and when editing, the products the purchase had when the dialog opened stay the ones the save and delete name. A product chosen on an item stays chosen even if another tab has since given it a purchase; the server then rejects the save.

## Saving on the Server

The `/api/purchases` route (`src/app/routes/api.purchases.ts`) accepts a POST to add a purchase, a PUT to edit one, and a DELETE to delete one. Each runs its checks and its change inside the `usage.json` update queue and writes `usage.json` once, so overlapping requests see each other's writes. None changes any field other than `purchase`, or any record its body does not name.

**Adding.** Inside the `usage.json` update queue (data-store design, *Serialized updates*), it validates the body and sets `purchase` to `{ date, store, price }` (without `store` when the body has none) on each item's product, writing `usage.json` once. It changes no other field and no other record.

A body is rejected, and the file left unchanged, when any item names a product id that matches no record, names a product that already has a `purchase`, or names the same product as another item. Because the check runs in the queue, overlapping POSTs see each other's writes, so two purchases cannot both claim one product.

**Editing.** A PUT names the purchase being edited by listing its products' ids in `replaces`. The server sets `purchase` to `{ date, store, price }` on each item's product, and removes `purchase` from each product in `replaces` that no item names. A body is rejected, and the file left unchanged, when any id in `replaces` matches no record or names a product with no `purchase`, when the products in `replaces` do not all have the same purchase date and the same store (or all no store), or when any item names a product id that matches no record, names the same product as another item, or names a product that has a `purchase` and is not in `replaces`. The server changes only the products the body names, so a product another tab has added to the same date and store is never taken off the purchase.

**Deleting.** A DELETE lists the purchase's products' ids in `productIds`. The server removes `purchase` from each. It rejects the body, and leaves the file unchanged, on the same `replaces` checks as editing, applied to `productIds`.

As when adding, being finished does not make a product fail any check.

The route reads and writes records through the data store, not through usage's loader, and applies no rollover, as the products route does (products design, *Saving on the Server*).

## API

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/purchases` | POST | `{ "date", "store"?, "items": [{ "productId", "price" }] }` | `null`; purchase added |
| `/api/purchases` | PUT | `{ "replaces": [productId], "date", "store"?, "items": [{ "productId", "price" }] }` | `null`; purchase replaced |
| `/api/purchases` | DELETE | `{ "productIds": [productId] }` | `null`; purchase deleted |
| `/api/purchases` | POST, PUT, or DELETE (invalid) | Body failing validation | 400 with `{ "error": "<message>" }`; file unchanged |
| `/api/purchases` | POST, PUT, or DELETE (storage failure) | Any | 500 with `{ "error": "<message>" }`; file unchanged |
| `/api/purchases` | PATCH | Any | 405 with `{ "error": "<message>" }`; file unchanged |

A POST body is valid when it is a JSON object with `date` and `items`, optionally `store`, and no other keys; `date` and `store` satisfy the field rules; `items` is a non-empty array of objects, each with exactly `productId` and `price`, where `price` satisfies the field rules and `productId` names a product with no `purchase` that no other item names. A PUT body is valid when it is a JSON object with `replaces`, `date`, and `items`, optionally `store`, and no other keys; `replaces` is a non-empty array of distinct integers naming products that have a `purchase`, all with the same date and store; `date`, `store`, and `items` are as for a POST, except that an item's `productId` may name a product in `replaces`. A DELETE body is valid when it is a JSON object with exactly `productIds`, which satisfies the rules for `replaces`. The error message describes the first failure found.

## Page Data

The purchases page loader (app-shell design, *Purchases Page*) reads `usage.json` and `configs.json` through the data store and passes the products and categories to `PurchaseList`. It reads `usage.json` directly rather than through usage's loader, so loading the page applies no month rollover; the page uses only names, brands, categories, and purchases.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Grouping into purchases | Same date and exactly the same store | A stored purchase id; store matched ignoring capitalization | Needs no extra field. Store suggestions make exact matches easy to type |
| Store suggestions | The store input suggests stores already used | Plain text; a configured list of stores | A typo or different capitalization would split one trip in two; suggestions prevent it without a store editor |
| Price units | Integer cents | Decimal dollars as numbers | Sums of cents are exact; floating-point dollars can total to `$31.999999` |
| Currency | US dollars only | A currency per purchase | One person's purchases in one currency; multiple currencies would need conversion to compare cost per use |
| Tax, shipping, quantity | Not recorded; each item's price is what was paid, and two of a product are two items | Fields for each | The price paid per product is all cost per use needs. Two of one item are two products, each with its own uses (HLD *Purchases per product*) |
| Store | Optional | Required | Not needed for cost per use |
| Purchase date | Required, no later than today, starting at today | Optional; any date | Most purchases are entered the day they happen; a future purchase is a typo |
| Products offered | Only products with no purchase that are not finished, plus "New product" | Every product, rejecting repeats on save | The dropdown never offers a choice the save would reject, and a used-up or discarded product will not be bought (products design, *Finished products*) |
| Product dropdown | Native dropdown with a section per category, brand then name with shade | Searchable combobox; sections labeled with group and category | Matches the product dialog's category dropdown and needs no new component. A native dropdown has one level of sections, and the category alone is what the user picks by |
| Opening a new product from an item | "New product" option in the item's product dropdown, choosing the saved product on that item | A separate "New product" button for the whole form | The product lands on the item it was created for, with no extra step to choose it |
| Abandoned purchases | A product created from the purchase form stays when the purchase is not saved | Delete it; save it only with the purchase | The user owns the product either way; products cannot be deleted, and saving it only with the purchase would mean two write paths for products (HLD *New products during a purchase*) |
| Product reads | `usage.json` through the data store, no rollover | Usage's loader | Keeps purchases independent of usage; nothing purchases reads depends on rollover |
| List order | Date, newest first, then store | Order entered | Past purchases are often entered late; date order keeps the list chronological |
| Identical product labels | Two products with the same brand, name, and shade show the same label | Add the category, id, or date added | Unbought products with the same brand, name, and shade are copies of one item, so either is the right choice |
| Products in unconfigured categories | Listed under "Other" at the end of the dropdown | Leave them out | Only data from before the category rules can hold one, and it can still be given its purchase |
| Price ceiling | None | A maximum price | Any typed price is a real amount someone could pay; a typo is corrected by editing (*Simplicity over robustness*) |
| Purchase fields written outside the app | Shown as they are | Report them on the page; fail the page | Only a hand edit can break the field rules, and the page still shows the data (as products treats malformed months) |
| What an edit works on | The whole purchase: date and store apply to all its products; items can be added, removed, and repriced | Edit each product's purchase on its own | Fixing a store typo or wrong date is one edit, not one per product. Removing an item is how a product comes off a purchase |
| Editing form | The purchase dialog, opened filled in | A separate edit dialog; inline editing in the list | One form keeps adding and editing consistent and reuses its validation and "New product" |
| Naming the purchase being edited | The request lists the products' ids the purchase had when the dialog opened | The original date and store | Purchases have no id. With date and store, the server would also take a product off the purchase that another tab added to the same date and store; naming products changes only what the user saw |
| Edit request | PUT with the full new purchase | PATCH with only the changed fields | A whole replacement needs no diff logic and matches what the dialog holds |
| Delete confirmation | Ask "Delete this purchase?" first | No confirmation, as the category and routine editors | Unlike an unused category or a routine, a deleted purchase's prices can only be recovered by retyping them |
| Deleting the last item while editing | Not possible: the remove control is disabled on the only item; Delete removes the purchase | Saving with no items deletes the purchase | Keeps "save" from silently meaning "delete" |

## Open Questions & Future Decisions

### Deferred
1. **Cost per use** — HLD Goal 2. Not yet designed: where it shows, and what it shows for a product with no purchase or no uses.
2. **Product dropdown length** — switch to a searchable combobox if the list of products without a purchase grows too long to scan.

## References

- src/features/purchases/types.ts
- src/features/purchases/money.ts
- src/features/purchases/purchase-list.tsx
- src/features/purchases/purchase-dialog.tsx
- src/features/purchases/use-purchase-editor.ts
- src/app/routes/api.purchases.ts
- src/app/routes/purchases.tsx
- src/utils/send-json.ts
- src/utils/today.ts
- src/utils/calendar-date.ts
- docs/high-level-design.md
- docs/intent/products/products-design.md
- docs/intent/data-store/data-store-design.md
- docs/intent/app-shell/app-shell-design.md
- docs/arrows/purchases.md
