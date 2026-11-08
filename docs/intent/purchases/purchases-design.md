---
parent: high-level-design
prefix: PURCH
---

# Purchases

## Context and Design Philosophy

The purchases segment records what each product cost (HLD *Approach*): the date a product was bought, the store, and the price paid. Purchases are the price half of cost per use; usage supplies the other half.

Each product record is bought at most once (HLD *Purchases per product*), so a product's purchase is stored on the product record itself, in its `purchase` field. The products segment defines that field as part of the record; the purchases segment owns its rules and is the only segment that changes it, as usage is for the count fields.

A purchase as the user sees it — one shopping trip — is the set of products with the same purchase date and store. Adding a purchase sets the `purchase` field on each product in it, in one write.

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
│ Nov 7, 2026 · Sephora               $32.00   │
│   Rare Beauty Positive Light Liquid… $32.00  │
│   Saie Glow Sculpt Cream Highlight…   $0.00  │
├──────────────────────────────────────────────┤
│ Oct 30, 2026                        $18.50   │
│   Glow Recipe Blueberry Bounce…      $18.50  │
└──────────────────────────────────────────────┘
```

- An "Add purchase" button opens the purchase dialog.
- Products with a `purchase` are grouped into purchases: products whose purchase has the same `date` and the same `store` (or no store) form one purchase. Store names match exactly.
- Purchases are listed newest first by date. Purchases on the same date are listed by store name in alphabetical order, ignoring capitalization, with the purchase that has no store last.
- Each purchase shows its date as month abbreviation, day, and year (`Nov 7, 2026`), its store when it has one, its total (the sum of its products' prices), and each product's brand, name, and price, in product `id` order.
- Amounts show as US dollars with two decimal places (`$32.00`).
- With no product purchases recorded, the list shows "No purchases yet."

## Purchase Dialog

`PurchaseDialog` (`src/features/purchases/purchase-dialog.tsx`) is a modal form for adding a purchase.

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
- **Date** — a date input, required, starting at today's local date. Dates after today cannot be chosen.
- **Store** — optional text, suggesting the stores already used on purchases.
- **Items** — the dialog opens with one empty item. "Add item" appends another empty item. Each item has a remove control, disabled while it is the only item.
- **Product** (per item) — a dropdown of the products that can be bought: those with no `purchase` and not chosen on another item of this form. Products are listed under their category, categories under their groups, in configured order, each shown as brand then name. Products whose category is not configured are listed last, under "Other". A product chosen on this item stays listed for it. The dropdown ends with a "New product" option.
- **Price** (per item) — a text input for dollars, accepting digits with an optional decimal point and at most two decimal places (`32`, `32.`, `32.5`, `32.50`, `.99`). A leading `$` and surrounding whitespace are ignored. A price that does not match this form is marked invalid.
- **Total** — the sum of the valid prices entered, updated as prices are typed.

**New product.** Choosing "New product" on an item opens the product dialog (products design, *Product Dialog*) over the purchase dialog, to add a product. When the product saves, the product dialog closes and the new product is chosen on that item. When the product dialog is closed without saving, the item keeps the product it had before "New product" was chosen. The new product is saved even if the purchase is never saved.

**Saving.** `usePurchaseEditor()` (`src/features/purchases/use-purchase-editor.ts`) trims the store and prices and sends one POST to `/api/purchases`. A blank store is omitted from the body. Each price is converted to whole cents.

Save is disabled while any item has no product, any price is blank or invalid, the date is empty or after today, or a save is in flight.

**After saving.** On success the dialog closes and the page's loaders revalidate, so the purchase appears in the list. On any failure the dialog stays open with its contents, and an error notification shows the server's message, or says the change was not saved if there was no response or the response carries no message.

**Closing.** Cancel, Esc, and the close control close the dialog and discard its contents; a click outside does nothing; while a save is in flight the dialog cannot be closed — the same rules, for the same reasons, as the product dialog. While the product dialog is open over it, Esc and outside clicks act on the product dialog only.

**While open.** If the page's loaders revalidate while the dialog is open, its fields keep their contents. A product chosen on an item stays chosen even if another tab has since given it a purchase; the server then rejects the save.

## Saving on the Server

The `/api/purchases` route (`src/app/routes/api.purchases.ts`) accepts a POST. Inside the `usage.json` update queue (data-store design, *Serialized updates*), it validates the body and sets `purchase` to `{ date, store, price }` (without `store` when the body has none) on each item's product, writing `usage.json` once. It changes no other field and no other record.

A body is rejected, and the file left unchanged, when any item names a product id that matches no record, names a product that already has a `purchase`, or names the same product as another item. Because the check runs in the queue, overlapping POSTs see each other's writes, so two purchases cannot both claim one product.

The route reads and writes records through the data store, not through usage's loader, and applies no rollover, as the products route does (products design, *Saving on the Server*).

## API

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/purchases` | POST | `{ "date", "store"?, "items": [{ "productId", "price" }] }` | `null`; purchase added |
| `/api/purchases` | POST (invalid) | Body failing validation | 400 with `{ "error": "<message>" }`; file unchanged |
| `/api/purchases` | POST (storage failure) | Any | 500 with `{ "error": "<message>" }`; file unchanged |
| `/api/purchases` | PUT, PATCH, or DELETE | Any | 405 with `{ "error": "<message>" }`; file unchanged |

A body is valid when it is a JSON object with `date` and `items`, optionally `store`, and no other keys; `date` and `store` satisfy the field rules; `items` is a non-empty array of objects, each with exactly `productId` and `price`, where `price` satisfies the field rules and `productId` names a product with no `purchase` that no other item names. The error message describes the first failure found.

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
| Products offered | Only products with no purchase, plus "New product" | Every product, rejecting repeats on save | The dropdown never offers a choice the save would reject |
| Product dropdown | Grouped native dropdown, brand then name | Searchable combobox | Matches the product dialog's category dropdown and needs no new component |
| Opening a new product from an item | "New product" option in the item's product dropdown, choosing the saved product on that item | A separate "New product" button for the whole form | The product lands on the item it was created for, with no extra step to choose it |
| Abandoned purchases | A product created from the purchase form stays when the purchase is not saved | Delete it; save it only with the purchase | The user owns the product either way; products cannot be deleted, and saving it only with the purchase would mean two write paths for products (HLD *New products during a purchase*) |
| Product reads | `usage.json` through the data store, no rollover | Usage's loader | Keeps purchases independent of usage; nothing purchases reads depends on rollover |
| List order | Date, newest first, then store | Order entered | Past purchases are often entered late; date order keeps the list chronological |
| Identical product labels | Two products with the same brand and name show the same label | Add the category, id, or date added | Unbought products with the same brand and name are copies of one item, so either is the right choice |
| Products in unconfigured categories | Listed under "Other" at the end of the dropdown | Leave them out | Only data from before the category rules can hold one, and it can still be given its purchase |
| Price ceiling | None | A maximum price | Any typed price is a real amount someone could pay; a typo is corrected by editing, once editing exists (*Simplicity over robustness*) |
| Purchase fields written outside the app | Shown as they are | Report them on the page; fail the page | Only a hand edit can break the field rules, and the page still shows the data (as products treats malformed months) |
| Editing and deleting purchases | Deferred | Build with adding | Adding is enough to start recording prices |

## Open Questions & Future Decisions

### Deferred
1. **Editing and deleting purchases** — HLD Goal 4 requires both. Editing must settle whether changing a purchase's date or store applies to every product in it; deleting removes the `purchase` field and offers those products for purchase again.
2. **Cost per use** — HLD Goal 2. Not yet designed: where it shows, and what it shows for a product with no purchase or no uses.
3. **Product dropdown length** — switch to a searchable combobox if the list of products without a purchase grows too long to scan.

## References

- src/features/purchases/types.ts
- src/features/purchases/purchase-list.tsx
- src/features/purchases/purchase-dialog.tsx
- src/features/purchases/use-purchase-editor.ts
- src/app/routes/api.purchases.ts
- src/app/routes/purchases.tsx
- docs/high-level-design.md
- docs/intent/products/products-design.md
- docs/intent/data-store/data-store-design.md
- docs/intent/app-shell/app-shell-design.md
- docs/arrows/purchases.md
