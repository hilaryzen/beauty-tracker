# Arrow: products

What a product is: the product record, categories, adding and editing products, and the category editor.

## Status

**MAPPED** — not yet audited. All specs implemented with tests.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/products/products-design.md

### EARS
- docs/intent/products/products-specs.md (190 specs)

### Tests
- src/app/routes/api.products.test.ts
- src/app/routes/api.categories.test.ts
- src/app/routes/api.usage.test.ts (record specs)
- src/features/products/category-rules.test.ts
- src/features/products/product-dialog.test.tsx
- src/features/products/category-editor.test.tsx

### Code
- src/features/products/types.ts
- src/features/products/category-rules.ts
- src/features/products/product-dialog.tsx
- src/features/products/category-editor.tsx
- src/features/products/use-product-editor.ts
- src/features/products/product-name.ts
- src/features/products/product-details.ts
- src/app/routes/api.products.ts
- src/app/routes/api.categories.ts
- src/utils/send-json.ts
- src/utils/this-month.ts
- src/utils/today.ts
- src/utils/calendar-date.ts
- src/assets/data/configs.json (`categories` key)

## Architecture

**Purpose:** Define the product record and category rules, and let the user add and edit products without opening a data file.

**Key Components:**
1. `Product` type — product record shape, including the optional `shade`, dates, `size`, `rating`, and `notes`, and the optional `purchase` field set only by purchases (`types.ts`)
2. `checkCategories` — category rules applied by `/api/configs` (`category-rules.ts`)
3. `ProductDialog` and `useProductEditor` — one modal form for add and edit; saves a new category through `/api/configs`, then the product through `/api/products`, and reports an added product's id through `onSaved` (`product-dialog.tsx`, `use-product-editor.ts`)
4. `/api/products` route — POST adds (responding with the new id) and PUT edits, validated inside a multi-file update holding `configs.json` and `usage.json`, with no rollover (`api.products.ts`)
5. `/api/categories` route — renames a category in `configs.json` and every product using it, in ordered writes inside one multi-file update (`api.categories.ts`)
6. `CategoryEditor` — adds, renames, reorders, moves, and deletes categories and groups on the settings page, saving each edit at once (`category-editor.tsx`)
7. `productName` — a product's name with its shade, used by the usage table, routine cards, routine editor, and purchases page (`product-name.ts`)
8. Size and rating rules — `isProductSize`, `isRating`, the size units, size formatting, and size amount parsing, shared by `/api/products`, the product dialog, and the usage table (`product-details.ts`)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Record | PROD-001 to PROD-008 | 8 | 0 | 0 |
| Dialog | PROD-EDIT-001 to PROD-EDIT-041 | 41 | 0 | 0 |
| Saving | PROD-SAVE-001 to PROD-SAVE-025 | 25 | 0 | 0 |
| API | PROD-API-001 to PROD-API-043 | 43 | 0 | 0 |
| Categories | PROD-CAT-001 to PROD-CAT-004 | 4 | 0 | 0 |
| Category rename | PROD-CATAPI-001 to PROD-CATAPI-023 | 23 | 0 | 0 |
| Category editor | PROD-CATEDIT-001 to PROD-CATEDIT-046 | 46 | 0 | 0 |

**Summary:** 190 specs, all `[x]`.

## Key Findings

1. **Deleting products is not designed** — needed for HLD Goal 4 (LLD deferred question 1).

## Work Required

### Nice to Have
1. Design deleting products (HLD Goal 4).
2. Decide whether categories should split into their own segment once inventory or purchases arrive.
