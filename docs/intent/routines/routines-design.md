---
parent: high-level-design
prefix: ROUT
---

# Routines

## Context and Design Philosophy

Most product use happens as part of a routine — a morning skincare sequence, a full makeup look. Logging each product individually after every routine is tedious, so a routine bundles products and logs a use for all of them in one click.

Routines own only the grouping. Recording and persisting the use belongs to the usage segment; routines call into it.

## Routine Definition

Routines are defined in `configs.json` under the `routines` key:

```json
"routines": {
  "Morning Skincare": [4, 5],
  "Makeup": [0, 1, 3, 8, 9],
  "Evening Skincare": [6, 7]
}
```

- **Key** — the routine's display name.
- **Value** — ordered array of product ids. An id is resolved as an index into the usage list (see the usage segment's item-addressing decision).
- **Order** — routines display in object key order; products within a routine display in array order.

Routines are edited by hand in the config file. The data-store segment's `/api/configs` endpoint could write them, but no UI calls it.

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
- Body: ordered list of product names, looked up from the usage list.
- Footer: present but empty.

## Logging a Routine

The + control calls the usage segment's `addUsesToItems(productIds)` with the routine's full id array; − calls `removeUsesFromItems(productIds)`. The usage segment applies the ±1 to each product and persists the whole list in one save.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Where routines are stored | `configs.json`, alongside categories | Own file; inside `usage.json` | [inferred] Routines are user configuration rather than tracked data |
| How a routine refers to products | Array of product ids resolved by index | Product names; id lookup by field | [inferred] Compact; matches how usage addresses items |
| Logging mechanism | Reuse usage's `useUsage` hook with the routine's id list | Routine-specific endpoint | [inferred] One write path for all use logging |
| Granularity of a routine log | All products in the routine, together | Per-product checkboxes within a routine | [inferred] One-click logging is the point of a routine |

## Open Questions & Future Decisions

### Deferred
1. **Invalid product references** — an id past the end of the usage list crashes the card (`usage[id].name` is undefined). Validate, skip, or treat as a config error?
2. **Routine editing in the UI** — should routines be creatable/editable in the app (via `/api/configs`), or stay hand-edited?
3. **Empty footer** — placeholder for future content (e.g. "last done", times this month), or remove?
4. **Partial routines** — is there a need to log a routine minus one product (e.g. skipped mascara today)?
5. **Duplicate ids in a routine** — if the same id appears twice, does logging count it once or twice? (Current code: each occurrence reads the already-updated entry from the working copy (`use-usage.ts:17-18`), so a duplicated id is counted twice.)

## References

- src/features/routine/routine-card.tsx
- src/assets/data/configs.json
- docs/intent/usage/usage-design.md
- docs/arrows/routines.md
