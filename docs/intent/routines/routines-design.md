---
parent: high-level-design
prefix: ROUT
---

# Routines

## Context and Design Philosophy

Most product use happens as part of a routine — a morning skincare sequence, a full makeup look. Logging each product individually after every routine is tedious, so a routine bundles products and logs a use for all of them in one click (HLD *Low friction over precision*). A routine always logs every product in it; if one was skipped that day, the user corrects it afterward from the usage table.

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

The data-store segment's `/api/configs` route applies these rules (data-store design, *Configuration API*). Routines are currently edited by hand in `configs.json`; an in-app routine editor (HLD Goal 4) is not yet designed.

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
- Body: ordered list of product names, looked up by `id` in the usage list.

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
| Integer-like routine names | Allowed; they display first | Reject them; store routines as an array | Such names are unlikely; not worth a rule or a format change |
| Unknown product id on a card | Show "Unknown product (id N)" | Fail the home page | One bad id should not hide the rest of the page |

## Open Questions & Future Decisions

### Deferred
1. **Routine editor** — HLD Goal 4 requires creating, renaming, reordering, and deleting routines in the app, sending changes through `/api/configs`. Not yet designed.
2. **Deleting a product listed in a routine** — once products can be deleted, deleting such a product would break the routine's logging. The products segment must either block the deletion or remove the product from routines.

## References

- src/features/routine/routine-card.tsx
- src/features/routine/routine-rules.ts
- src/assets/data/configs.json
- docs/intent/products/products-design.md
- docs/intent/usage/usage-design.md
- docs/intent/data-store/data-store-design.md
- docs/arrows/routines.md
