# Usage Specs

EARS requirements for the usage segment. Design: [usage-design.md](usage-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet implemented, or implemented but not yet covered by tests, `[D]` deferred.

## Month Rollover

- [x] **USAGE-ROLL-001**: When usage data is loaded (by the home page loader, a GET of `/api/usage`, or a POST to `/api/usage` before its change is applied), the system shall, for each product record whose current month is earlier than the server's current local month, add the record's current-month use count to its closed-month count for that month.
- [x] **USAGE-ROLL-002**: When usage data is loaded (by the home page loader, a GET of `/api/usage`, or a POST to `/api/usage` before its change is applied), the system shall, for each product record whose current month is earlier than the server's current local month, set the record's current-month use count to 0 and its current month to the server's current local month.
- [x] **USAGE-ROLL-003**: When loading usage data changes any product record through rollover, the system shall write `usage.json` before returning the loaded data.
- [x] **USAGE-ROLL-004**: While a product record's current month is equal to or later than the server's current local month, the system shall leave that record unchanged during rollover.
- [x] **USAGE-ROLL-005**: If writing `usage.json` after rollover fails while the home page loads, then the system shall show the error page.
- [x] **USAGE-ROLL-006**: If writing `usage.json` after rollover fails while handling a GET of `/api/usage`, then the system shall respond with 500 and a JSON body of the form `{ "error": "<message>" }`.
- [x] **USAGE-ROLL-007**: If any product record in `usage.json` has no current month in `YYYY-MM` form when usage data is loaded, then the system shall treat `usage.json` as unreadable.
- [x] **USAGE-ROLL-008**: When rollover changes a product record, the system shall leave every field of the record other than `uses`, `currentMonth`, and `usesThisMonth` unchanged.

## Usage Table

- [x] **USAGE-UI-001**: The home page shall display a usage table whose product rows show category, product name, brand, overall uses, and this month's uses.
- [x] **USAGE-UI-002**: The usage table shall order rows by the position of each product's category in the concatenation of all configured category groups, taken in the groups' configured order.
- [x] **USAGE-UI-003**: When two products in the usage table share a category position, the usage table shall keep them in their stored order.
- [x] **USAGE-UI-004**: The usage table shall show, as a product's overall uses, the sum of the product's closed-month use counts plus its current-month use count.
- [x] **USAGE-UI-005**: The usage table shall show a + and a − control on every product row.
- [x] **USAGE-UI-006**: If `configs.json` has no `categories` key, then the usage table shall show product rows in their stored order.
- [x] **USAGE-UI-007**: The usage table shall show an Add product button above the product rows.
- [x] **USAGE-UI-008**: The usage table shall show an edit button on every product row.
- [x] **USAGE-UI-009**: When the user activates the Add product button, the usage table shall open the product dialog to add a product.
- [x] **USAGE-UI-010**: When the user activates a product row's edit button, the usage table shall open the product dialog to edit that product.
- [x] **USAGE-UI-011**: While a product record has a `shade`, the usage table shall show in that row's Product column the product name, followed by ` – ` (space, en dash, space) and the shade, all in the same text style as the name.
- [x] **USAGE-UI-012**: While a product record has no `shade`, the usage table shall show only the product name in that row's Product column.

## Usage Table Group Tabs

- [x] **USAGE-UI-013**: The usage table shall show a row of tabs: an "All" tab first, followed by one tab per category group in `configs.json → categories`, in the groups' configured order, each labeled with its group name.
- [x] **USAGE-UI-014**: While the usage table's "All" tab is selected, the usage table shall show one row per product record.
- [x] **USAGE-UI-015**: While a group tab is selected in the usage table, the usage table shall show one row per product record whose category is in that group, and no other product rows.
- [x] **USAGE-UI-016**: While a group tab is selected in the usage table and no product record's category is in that group, the usage table shall show the message "No products in this group." in place of product rows.
- [x] **USAGE-UI-017**: If `configs.json` has no `categories` key, then the usage table shall show only the "All" tab.
- [x] **USAGE-UI-018**: While the home page URL's `group` search parameter equals the name of a configured category group, the usage table shall select that group's tab.
- [x] **USAGE-UI-019**: While the home page URL has no `group` search parameter, the usage table shall select the "All" tab.
- [x] **USAGE-UI-020**: If the home page URL's `group` search parameter matches no configured category group name, then the usage table shall select the "All" tab.
- [x] **USAGE-UI-021**: When the user selects a group tab other than the selected tab in the usage table, the system shall set the home page URL's `group` search parameter to that group's name.
- [x] **USAGE-UI-022**: When the user selects the "All" tab in the usage table while another tab is selected, the system shall remove the `group` search parameter from the home page URL.
- [x] **USAGE-UI-023**: When the user selects a usage table tab other than the selected tab, the system shall add a browser history entry for the new URL.
- [x] **USAGE-UI-024**: When the user selects the usage table tab that is already selected, the system shall leave the home page URL unchanged.
- [x] **USAGE-UI-025**: When the user moves keyboard focus between usage table tabs with the arrow keys, the usage table shall leave the selected tab unchanged.

## Usage Table Dates

- [x] **USAGE-UI-026**: The usage table shall show Purchased, Opened, Expires, and Removed columns, in that order, after the This Month's Uses column and before the + and − controls.
- [x] **USAGE-UI-027**: While a product record has a `purchase`, the usage table shall show the purchase's `date`, as stored in `YYYY-MM-DD` form, in that row's Purchased column.
- [x] **USAGE-UI-028**: While a product record has an `opened`, `expires`, or `removed` date, the usage table shall show that date, as stored in `YYYY-MM-DD` form, in that row's Opened, Expires, or Removed column respectively.
- [x] **USAGE-UI-029**: While a product record has no `purchase`, the usage table shall leave that row's Purchased cell empty.
- [x] **USAGE-UI-030**: While a product record has no `opened`, `expires`, or `removed` date, the usage table shall leave that row's Opened, Expires, or Removed cell respectively empty.

## Logging

- [x] **USAGE-LOG-001**: When the user activates a product row's + control in the usage table, the system shall increase that product's current-month use count by 1.
- [x] **USAGE-LOG-002**: When the user activates a product row's − control in the usage table, the system shall decrease that product's current-month use count by 1, subject to USAGE-LOG-006.
- [x] **USAGE-LOG-003**: When a use is logged for a set of products (one product from the usage table, or several from a routine), the system shall apply the ±1 current-month change to every product in the set.
- [x] **USAGE-LOG-004**: When a use is logged for a set of products (one product from the usage table, or several from a routine), the page shall send a single POST to `/api/usage` with body `{ "ids": [...], "delta": 1 | -1 }`.
- [x] **USAGE-LOG-005**: When a logged use has been saved, the home page shall re-display the usage table and routine cards from the saved data.
- [x] **USAGE-LOG-006**: If a −1 change applies to a product whose current-month use count is 0, then the system shall leave that count at 0 and still apply the −1 to every other product in the same request.
- [x] **USAGE-LOG-007**: If a POST to `/api/usage` responds with an error status, then the page shall show an error notification stating that the change was not saved.
- [x] **USAGE-LOG-008**: If a POST to `/api/usage` responds with an error status, then the page shall continue to show the last saved usage data.
- [x] **USAGE-LOG-009**: When a use is logged while an earlier POST to `/api/usage` is still in flight, the page shall send a new POST without cancelling the earlier one.
- [x] **USAGE-LOG-010**: If a POST to `/api/usage` gets no response, then the page shall show an error notification stating that the change was not saved.
- [x] **USAGE-LOG-011**: If a POST to `/api/usage` gets no response, then the page shall continue to show the last saved usage data.
- [x] **USAGE-LOG-012**: When a logged use changes a product record, the system shall leave every field of the record other than `usesThisMonth` unchanged.

## API

- [x] **USAGE-API-001**: When `/api/usage` receives a GET request, the system shall return the full list of product records with rollover applied.
- [x] **USAGE-API-002**: If `/api/usage` receives a GET request and `usage.json` cannot be read, then the system shall respond with 500 and a JSON body of the form `{ "error": "<message>" }`.
- [x] **USAGE-API-003**: When `/api/usage` receives a POST request whose body passes validation, the system shall apply `delta` to the current-month use count of each product whose `id` is in `ids` and write `usage.json` once.
- [x] **USAGE-API-004**: If a POST body to `/api/usage` lacks `ids` or `delta`, or contains any other top-level key, then the system shall treat the body as failing validation.
- [x] **USAGE-API-005**: If `ids` in a POST body to `/api/usage` is not a non-empty array of integers, then the system shall treat the body as failing validation.
- [x] **USAGE-API-006**: If `ids` in a POST body to `/api/usage` contains the same id more than once, then the system shall treat the body as failing validation.
- [x] **USAGE-API-007**: If any id in a POST body to `/api/usage` matches no product record, then the system shall treat the body as failing validation.
- [x] **USAGE-API-008**: If `delta` in a POST body to `/api/usage` is not `1` or `-1`, then the system shall treat the body as failing validation.
- [x] **USAGE-API-009**: If a POST body to `/api/usage` fails validation, then the system shall respond with 400 and a JSON body of the form `{ "error": "<message>" }` describing the first failure found.
- [x] **USAGE-API-010**: If a POST body to `/api/usage` fails validation, then the system shall leave `usage.json` unchanged.
- [x] **USAGE-API-011**: If a POST to `/api/usage` cannot complete because `usage.json` cannot be read or written, then the system shall respond with 500 and a JSON body of the form `{ "error": "<message>" }`.
- [x] **USAGE-API-012**: If a POST to `/api/usage` cannot complete because `usage.json` cannot be read or written, then the system shall leave `usage.json` unchanged.
