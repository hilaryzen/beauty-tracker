# Arrow: products

What a product is: the product record, categories, and adding and editing products in the app.

## Status

**MAPPED** — not yet audited. The record and category rules exist in code under `src/features/usage/`; the product dialog and `/api/products` are designed but not built.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/products/products-design.md

### EARS
- docs/intent/products/products-specs.md (55 specs)

### Tests
- src/app/routes/api.usage.test.ts (cites the record specs under their former IDs)
- src/features/usage/category-rules.test.ts (cites the category specs under their former IDs)

### Code
- src/features/usage/types.ts (moves to `src/features/products/types.ts`)
- src/features/usage/category-rules.ts (moves to `src/features/products/category-rules.ts`)
- src/assets/data/configs.json (`categories` key)

## Architecture

**Purpose:** Define the product record and category rules, and let the user add and edit products without opening a data file.

**Key Components:**
1. `Product` type — product record shape (currently `ItemUsage`)
2. `checkCategories` — category rules applied by `/api/configs`
3. `ProductDialog` and `useProductEditor` — one modal form for add and edit; saves a new category through `/api/configs`, then the product through `/api/products` (not built)
4. `/api/products` route — POST adds and PUT edits, validated inside the `usage.json` queue, with no rollover (not built)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| Record | PROD-001 to PROD-002 | 2 | 0 | 0 |
| Dialog | PROD-EDIT-001 to PROD-EDIT-018 | 0 | 0 | 18 |
| Saving | PROD-SAVE-001 to PROD-SAVE-014 | 0 | 0 | 14 |
| API | PROD-API-001 to PROD-API-017 | 0 | 0 | 17 |
| Categories | PROD-CAT-001 to PROD-CAT-004 | 3 | 0 | 1 |

**Summary:** 55 specs: 5 `[x]`, 50 `[ ]`.

## Key Findings

1. **Code still cites former spec IDs** — `@spec` comments in `types.ts`, `category-rules.ts`, `api.usage.ts`, and their tests cite `USAGE-001`, `USAGE-002`, and `USAGE-CAT-001` to `USAGE-CAT-003`, which are now `PROD-001`, `PROD-002`, and `PROD-CAT-001` to `PROD-CAT-003`.
2. **Code still lives in the usage folder** — the record type and category rules move to `src/features/products/`, and `ItemUsage` becomes `Product`.

## Work Required

### Must Fix
1. Update the `@spec` comments and move the files (findings 1 and 2) when this segment is implemented.
2. Implement the `[ ]` specs.

### Nice to Have
1. Decide whether categories should split into their own segment once inventory or purchases arrive.
