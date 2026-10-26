# Routines Specs

EARS requirements for the routines segment. Design: [routines-design.md](routines-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet covered by tests (all current specs describe behavior observed in code but untested), `[D]` deferred.

## Routine Definition

- [ ] **ROUT-001**: The system shall read routines from the `routines` key of the configuration, where each routine is a name mapped to an ordered list of product ids.

## Routine Cards

- [ ] **ROUT-UI-001**: The home page shall display one routine card per configured routine, in configuration order.
- [ ] **ROUT-UI-002**: Each routine card shall show the routine's name as its title.
- [ ] **ROUT-UI-003**: Each routine card shall list the names of the routine's products in the routine's configured order.
- [ ] **ROUT-UI-004**: Each routine card shall show a + and a − control.

## Logging

- [ ] **ROUT-LOG-001**: When the user activates a routine card's + control, the system shall log a +1 current-month use for every product in that routine as one logging set (usage segment, USAGE-LOG-003 and USAGE-LOG-004).
- [ ] **ROUT-LOG-002**: When the user activates a routine card's − control, the system shall log a −1 current-month use for every product in that routine as one logging set (usage segment, USAGE-LOG-003 and USAGE-LOG-004).
