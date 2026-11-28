# Arrow: inventory

The inventory table on the home page: every product with its details, purchase, and use counts, grouped by category group, sorted by status, with per-product logging controls.

## Status

**MAPPED** — not yet audited; sampled 2026-11-27. All specs implemented with tests.

## References

### HLD
- docs/high-level-design.md

### LLD
- docs/intent/inventory/inventory-design.md

### EARS
- docs/intent/inventory/inventory-specs.md (44 specs)

### Tests
- src/features/inventory/inventory-table.test.tsx

### Code
- src/features/inventory/inventory-table.tsx
- src/assets/data/configs.json (`categories` key — consumed for tabs and sort order)

## Architecture

**Purpose:** Show every product record in one table, sorted by status and then category with a tab per category group, showing each product's status, size, cost (its purchase price), rating, use counts, and purchase, opened, expiring, and removed dates, and let the user add or remove a use. Depends on the products segment for the record, categories, and product dialog, on the purchases segment for the purchase date and price, and on the usage segment for logging.

**Key Components:**
1. `InventoryTable` — "All" and per-group tabs, with the selected group kept in the URL's `group` parameter, over a table with Status as its first column, sorted by status position and then category position across all groups, with per-row +/- controls that call `useUsage` and Edit buttons, plus an Add product button; both open the products segment's dialog (`inventory-table.tsx`)

## Spec Coverage

| Category | Spec IDs | Implemented | Deferred | Gaps |
|----------|----------|-------------|----------|------|
| UI | INV-UI-001 to INV-UI-042 | 42 | 0 | 0 |
| Logging controls | INV-LOG-001, INV-LOG-002 | 2 | 0 | 0 |

**Summary:** 44 specs, all `[x]`.

## Key Findings

None open.
