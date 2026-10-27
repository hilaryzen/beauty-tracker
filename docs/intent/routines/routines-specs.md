# Routines Specs

EARS requirements for the routines segment. Design: [routines-design.md](routines-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet implemented, or implemented but not yet covered by tests, `[D]` deferred.

## Routine Definition

- [ ] **ROUT-001**: The system shall read routines from the `routines` key of `configs.json`, where each routine is a name mapped to an ordered list of product ids, each id referring to a product record's `id` field.

## Routine Cards

- [ ] **ROUT-UI-001**: The home page shall display one routine card per configured routine, in configuration order, except that routines whose names are integer-like (such as `"2"`) display before all others.
- [ ] **ROUT-UI-002**: Each routine card shall show the routine's name as its title.
- [ ] **ROUT-UI-003**: Each routine card shall list the names of the routine's products, found by product `id`, in the routine's configured order.
- [ ] **ROUT-UI-004**: Each routine card shall show a + and a − control.
- [ ] **ROUT-UI-005**: If a routine lists a product id that matches no product record, then its routine card shall show "Unknown product (id N)", with N the id, in that product's place.
- [ ] **ROUT-UI-006**: While no routines are configured (the `routines` value is an empty object, or `configs.json` has no `routines` key), the home page shall show no routine cards.

## Logging

- [ ] **ROUT-LOG-001**: When the user activates a routine card's + control, the system shall log a +1 current-month use for every product in that routine as one logging set (usage segment, USAGE-LOG-003 and USAGE-LOG-004).
- [ ] **ROUT-LOG-002**: When the user activates a routine card's − control, the system shall log a −1 current-month use for every product in that routine as one logging set (usage segment, USAGE-LOG-003 and USAGE-LOG-004).

## Validation

- [ ] **ROUT-VAL-001**: When a `routines` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation unless it is an object whose values are arrays of integers.
- [ ] **ROUT-VAL-002**: When a `routines` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any routine name is empty or contains only whitespace.
- [ ] **ROUT-VAL-006**: When a `routines` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any routine name starts or ends with whitespace.
- [ ] **ROUT-VAL-003**: When a `routines` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any routine lists no products.
- [ ] **ROUT-VAL-004**: When a `routines` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any routine lists the same product id more than once.
- [ ] **ROUT-VAL-005**: When a `routines` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any listed product id matches no product record in `usage.json`.
