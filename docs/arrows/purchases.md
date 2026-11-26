# Arrow: purchases

What each product cost: a product's purchase (date, store, price), the purchase list, and adding, editing, and deleting purchases in the app.

## Status

**MAPPED** — not yet audited; sampled 2026-11-07. All specs implemented with tests.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/purchases/purchases-design.md

### EARS
- docs/intent/purchases/purchases-specs.md (106 specs)

### Tests
- src/app/routes/api.purchases.test.ts
- src/features/purchases/purchase-list.test.tsx
- src/features/purchases/purchase-dialog.test.tsx

### Code
- src/features/purchases/types.ts
- src/features/purchases/money.ts
- src/features/purchases/purchase-list.tsx
- src/features/purchases/purchase-dialog.tsx
- src/features/purchases/use-purchase-editor.ts
- src/app/routes/api.purchases.ts
- src/utils/send-json.ts
- src/utils/today.ts
- src/utils/calendar-date.ts

## Architecture

**Purpose:** Record what each product cost, as an optional `purchase` field on its product record, and let the user add, edit, and delete purchases — including for products already tracked, or new products created from the purchase form — without opening a data file. Depends on the products segment for the record and the product dialog.

**Key Components:**
1. `ProductPurchase` type — `{ date, store?, price }`, price in cents (`types.ts`)
2. `PurchaseList` — groups products by purchase date and exact store, newest first, with totals, an Add purchase button, and an Edit button per purchase (`purchase-list.tsx`)
3. `PurchaseDialog` and `usePurchaseEditor` — modal form for adding or editing a purchase, with date, store suggestions, and items offering only products with no purchase that are not finished (plus, when editing, the purchase's own products), "New product" opening the product dialog, and, when editing, Delete behind a confirmation; one POST, PUT, or DELETE to `/api/purchases` (`purchase-dialog.tsx`, `use-purchase-editor.ts`)
4. `/api/purchases` route — inside the `usage.json` queue, POST sets `purchase` on each item's product, rejecting products already bought; PUT replaces the purchase on the products it names; DELETE removes it (`api.purchases.ts`)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Field | PURCH-001 | 1 | 0 | 0 |
| List | PURCH-LIST-001 to PURCH-LIST-013 | 13 | 0 | 0 |
| Dialog | PURCH-DLG-001 to PURCH-DLG-044 | 44 | 0 | 0 |
| Saving | PURCH-SAVE-001 to PURCH-SAVE-012 | 12 | 0 | 0 |
| API | PURCH-API-001 to PURCH-API-036 | 36 | 0 | 0 |

**Summary:** 106 specs, all `[x]`.

## Key Findings

1. **Cost per use is not designed** — HLD Goal 2 (LLD deferred question 1).

## Work Required

### Nice to Have
1. Design cost per use (HLD Goal 2).
