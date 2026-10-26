# Usage Specs

EARS requirements for the usage segment. Design: [usage-design.md](usage-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet covered by tests (all current specs describe behavior observed in code but untested), `[D]` deferred.

## Product Record

- [ ] **USAGE-001**: The system shall store each tracked product as a record with a numeric id, name, brand, category, a map of past-month use counts keyed by `YYYY-MM`, and a current-month use count.

## Usage Table

- [ ] **USAGE-UI-001**: The home page shall display a usage table with one row per product record, showing category, product name, brand, overall uses, and this month's uses.
- [ ] **USAGE-UI-002**: The usage table shall order rows by the position of each product's category in the configured category lists, taken in the order skincare, makeup, lips.
- [ ] **USAGE-UI-003**: When two products in the usage table share a category position, the usage table shall keep them in their stored order.
- [ ] **USAGE-UI-004**: The usage table shall show, as a product's overall uses, the sum of that product's past-month use counts.
- [ ] **USAGE-UI-005**: The usage table shall show a + and a − control on every product row.

## Logging

- [ ] **USAGE-LOG-001**: When the user activates a product row's + control in the usage table, the system shall increase that product's current-month use count by 1.
- [ ] **USAGE-LOG-002**: When the user activates a product row's − control in the usage table, the system shall decrease that product's current-month use count by 1.
- [ ] **USAGE-LOG-003**: When a use is logged for a set of products (one product from the usage table, or several from a routine), the system shall apply the ±1 current-month change to every product in the set.
- [ ] **USAGE-LOG-004**: When a use is logged for a set of products (one product from the usage table, or several from a routine), the system shall persist the updated product records to `/api/usage` in a single save.
- [ ] **USAGE-LOG-005**: When a logged use has been persisted, the home page shall re-display the usage table and routine cards from the saved data.

## API

- [ ] **USAGE-API-001**: When `/api/usage` receives a GET request, the system shall return the full list of product records.
- [ ] **USAGE-API-002**: If `/api/usage` receives a GET request and the usage data cannot be read, then the system shall respond with 404 Not Found.
- [ ] **USAGE-API-003**: When `/api/usage` receives a POST request with a JSON list of product records, the system shall replace the stored usage data with that list.
