# Usage Specs

EARS requirements for the usage segment. Design: [usage-design.md](usage-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet implemented, or implemented but not yet covered by tests, `[D]` deferred.

## Product Record

- [ ] **USAGE-001**: The system shall store each tracked product as a record with an integer id, name, brand, category, a map of closed-month use counts keyed by `YYYY-MM`, a current month in `YYYY-MM` form, and a use count for that current month.
- [ ] **USAGE-002**: The system shall locate a product record by its `id` field, independent of the record's position in `usage.json`.

## Month Rollover

- [ ] **USAGE-ROLL-001**: When usage data is loaded (by the home page loader, a GET of `/api/usage`, or a POST to `/api/usage` before its change is applied), the system shall, for each product record whose current month is earlier than the server's current local month, add the record's current-month use count to its closed-month count for that month.
- [ ] **USAGE-ROLL-002**: When usage data is loaded (by the home page loader, a GET of `/api/usage`, or a POST to `/api/usage` before its change is applied), the system shall, for each product record whose current month is earlier than the server's current local month, set the record's current-month use count to 0 and its current month to the server's current local month.
- [ ] **USAGE-ROLL-003**: When loading usage data changes any product record through rollover, the system shall write `usage.json` before returning the loaded data.
- [ ] **USAGE-ROLL-004**: While a product record's current month is equal to or later than the server's current local month, the system shall leave that record unchanged during rollover.
- [ ] **USAGE-ROLL-005**: If writing `usage.json` after rollover fails while the home page loads, then the system shall show the error page.
- [ ] **USAGE-ROLL-006**: If writing `usage.json` after rollover fails while handling a GET of `/api/usage`, then the system shall respond with 500 and a JSON body of the form `{ "error": "<message>" }`.

## Usage Table

- [ ] **USAGE-UI-001**: The home page shall display a usage table with one row per product record, showing category, product name, brand, overall uses, and this month's uses.
- [ ] **USAGE-UI-002**: The usage table shall order rows by the position of each product's category in the concatenation of all configured category groups, taken in the groups' configured order.
- [ ] **USAGE-UI-003**: When two products in the usage table share a category position, the usage table shall keep them in their stored order.
- [ ] **USAGE-UI-004**: The usage table shall show, as a product's overall uses, the sum of the product's closed-month use counts plus its current-month use count.
- [ ] **USAGE-UI-005**: The usage table shall show a + and a − control on every product row.
- [ ] **USAGE-UI-006**: If `configs.json` has no `categories` key, then the usage table shall show product rows in their stored order.

## Logging

- [ ] **USAGE-LOG-001**: When the user activates a product row's + control in the usage table, the system shall increase that product's current-month use count by 1.
- [ ] **USAGE-LOG-002**: When the user activates a product row's − control in the usage table, the system shall decrease that product's current-month use count by 1, subject to USAGE-LOG-006.
- [ ] **USAGE-LOG-003**: When a use is logged for a set of products (one product from the usage table, or several from a routine), the system shall apply the ±1 current-month change to every product in the set.
- [ ] **USAGE-LOG-004**: When a use is logged for a set of products (one product from the usage table, or several from a routine), the page shall send a single POST to `/api/usage` with body `{ "ids": [...], "delta": 1 | -1 }`.
- [ ] **USAGE-LOG-005**: When a logged use has been saved, the home page shall re-display the usage table and routine cards from the saved data.
- [ ] **USAGE-LOG-006**: If a −1 change applies to a product whose current-month use count is 0, then the system shall leave that count at 0 and still apply the −1 to every other product in the same request.
- [ ] **USAGE-LOG-007**: If a POST to `/api/usage` responds with an error status, then the page shall show an error notification stating that the change was not saved.
- [ ] **USAGE-LOG-008**: If a POST to `/api/usage` responds with an error status, then the page shall continue to show the last saved usage data.
- [ ] **USAGE-LOG-009**: When a use is logged while an earlier POST to `/api/usage` is still in flight, the page shall send a new POST without cancelling the earlier one.

## API

- [ ] **USAGE-API-001**: When `/api/usage` receives a GET request, the system shall return the full list of product records with rollover applied.
- [ ] **USAGE-API-002**: If `/api/usage` receives a GET request and `usage.json` cannot be read, then the system shall respond with 500 and a JSON body of the form `{ "error": "<message>" }`.
- [ ] **USAGE-API-003**: When `/api/usage` receives a POST request whose body passes validation, the system shall apply `delta` to the current-month use count of each product whose `id` is in `ids` and write `usage.json` once.
- [ ] **USAGE-API-004**: If a POST body to `/api/usage` lacks `ids` or `delta`, or contains any other top-level key, then the system shall treat the body as failing validation.
- [ ] **USAGE-API-005**: If `ids` in a POST body to `/api/usage` is not a non-empty array of integers, then the system shall treat the body as failing validation.
- [ ] **USAGE-API-006**: If `ids` in a POST body to `/api/usage` contains the same id more than once, then the system shall treat the body as failing validation.
- [ ] **USAGE-API-007**: If any id in a POST body to `/api/usage` matches no product record, then the system shall treat the body as failing validation.
- [ ] **USAGE-API-008**: If `delta` in a POST body to `/api/usage` is not `1` or `-1`, then the system shall treat the body as failing validation.
- [ ] **USAGE-API-009**: If a POST body to `/api/usage` fails validation, then the system shall respond with 400 and a JSON body of the form `{ "error": "<message>" }` describing the first failure found.
- [ ] **USAGE-API-010**: If a POST body to `/api/usage` fails validation, then the system shall leave `usage.json` unchanged.
- [ ] **USAGE-API-011**: If a POST to `/api/usage` cannot complete because `usage.json` cannot be read or written, then the system shall respond with 500 and a JSON body of the form `{ "error": "<message>" }`.
- [ ] **USAGE-API-012**: If a POST to `/api/usage` cannot complete because `usage.json` cannot be read or written, then the system shall leave `usage.json` unchanged.

## Categories

- [ ] **USAGE-CAT-001**: When a `categories` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation unless it is an object whose values are arrays (possibly empty) of non-empty strings.
- [ ] **USAGE-CAT-002**: When a `categories` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any category name appears more than once across all groups.
- [ ] **USAGE-CAT-003**: When a `categories` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if it omits a category that any product record in `usage.json` uses.
