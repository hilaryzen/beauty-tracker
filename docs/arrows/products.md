# Arrow: products

What a product is: the product record, categories, and adding and editing products in the app.

## Status

**MAPPED** — not yet audited. All specs implemented with tests.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/products/products-design.md

### EARS
- docs/intent/products/products-specs.md (57 specs)

### Tests
- src/app/routes/api.products.test.ts
- src/app/routes/api.usage.test.ts (record specs)
- src/features/products/category-rules.test.ts
- src/features/products/product-dialog.test.tsx

### Code
- src/features/products/types.ts
- src/features/products/category-rules.ts
- src/features/products/product-dialog.tsx
- src/features/products/use-product-editor.ts
- src/app/routes/api.products.ts
- src/utils/this-month.ts
- src/assets/data/configs.json (`categories` key)

## Architecture

**Purpose:** Define the product record and category rules, and let the user add and edit products without opening a data file.

**Key Components:**
1. `Product` type — product record shape (`types.ts`)
2. `checkCategories` — category rules applied by `/api/configs` (`category-rules.ts`)
3. `ProductDialog` and `useProductEditor` — one modal form for add and edit; saves a new category through `/api/configs`, then the product through `/api/products` (`product-dialog.tsx`, `use-product-editor.ts`)
4. `/api/products` route — POST adds and PUT edits, validated inside the `usage.json` queue, with no rollover (`api.products.ts`)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Record | PROD-001 to PROD-002 | 2 | 0 | 0 |
| Dialog | PROD-EDIT-001 to PROD-EDIT-018 | 18 | 0 | 0 |
| Saving | PROD-SAVE-001 to PROD-SAVE-014 | 14 | 0 | 0 |
| API | PROD-API-001 to PROD-API-019 | 19 | 0 | 0 |
| Categories | PROD-CAT-001 to PROD-CAT-004 | 4 | 0 | 0 |

**Summary:** 57 specs, all `[x]`.

## Key Findings

1. **Deleting products and a category editor are not designed** — both are needed for HLD Goal 4 (LLD deferred questions 1 and 2).

## Work Required

### Nice to Have
1. Design deleting products and the category editor (HLD Goal 4).
2. Decide whether categories should split into their own segment once inventory or purchases arrive.
