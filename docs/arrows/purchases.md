# Arrow: purchases

What each product cost: a product's purchase (date, store, price), the purchase list, and adding purchases in the app.

## Status

**MAPPED** — not yet audited; sampled 2026-11-07. All specs implemented with tests.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/purchases/purchases-design.md

### EARS
- docs/intent/purchases/purchases-specs.md (68 specs)

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

## Architecture

**Purpose:** Record what each product cost, as an optional `purchase` field on its product record, and let the user add purchases — including for products already tracked, or new products created from the purchase form — without opening a data file. Depends on the products segment for the record and the product dialog.

**Key Components:**
1. `ProductPurchase` type — `{ date, store?, price }`, price in cents (`types.ts`)
2. `PurchaseList` — groups products by purchase date and exact store, newest first, with totals and an Add purchase button (`purchase-list.tsx`)
3. `PurchaseDialog` and `usePurchaseEditor` — modal form with date, store suggestions, and items offering only products with no purchase, plus "New product" opening the product dialog; one POST to `/api/purchases` (`purchase-dialog.tsx`, `use-purchase-editor.ts`)
4. `/api/purchases` route — POST validates the body and sets `purchase` on each item's product inside the `usage.json` queue, rejecting products already bought (`api.purchases.ts`)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Field | PURCH-001 | 1 | 0 | 0 |
| List | PURCH-LIST-001 to PURCH-LIST-010 | 10 | 0 | 0 |
| Dialog | PURCH-DLG-001 to PURCH-DLG-027 | 27 | 0 | 0 |
| Saving | PURCH-SAVE-001 to PURCH-SAVE-009 | 9 | 0 | 0 |
| API | PURCH-API-001 to PURCH-API-021 | 21 | 0 | 0 |

**Summary:** 68 specs, all `[x]`.

## Key Findings

1. **Editing and deleting purchases, and cost per use, are not designed** — HLD Goals 2 and 4 (LLD deferred questions 1 and 2).

## Work Required

### Nice to Have
1. Design editing and deleting purchases (HLD Goal 4).
2. Design cost per use (HLD Goal 2).
