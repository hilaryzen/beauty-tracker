# Purchases Specs

EARS requirements for the purchases segment. Design: [purchases-design.md](purchases-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet implemented, or implemented but not yet covered by tests, `[D]` deferred.

## Purchase Field

- [x] **PURCH-001**: The system shall store a product's purchase in an optional `purchase` field on its product record, holding the purchase date in `YYYY-MM-DD` form, an optional store name, and the price paid as an integer number of cents.

## Purchase List

- [x] **PURCH-LIST-001**: The purchase list shall show an "Add purchase" button.
- [x] **PURCH-LIST-002**: The purchase list shall show the products whose purchases have the same date and the same store, or the same date and no store, as one purchase.
- [x] **PURCH-LIST-003**: The purchase list shall order purchases by date, newest first.
- [x] **PURCH-LIST-004**: The purchase list shall order purchases with the same date by store name in alphabetical order ignoring capitalization, with the purchase that has no store last.
- [x] **PURCH-LIST-005**: The purchase list shall show each purchase's date as the month abbreviation, day, and year, such as `Nov 7, 2026`.
- [x] **PURCH-LIST-006**: The purchase list shall show each purchase's store when it has one.
- [x] **PURCH-LIST-007**: The purchase list shall show each purchase's total, the sum of its products' prices.
- [x] **PURCH-LIST-008**: The purchase list shall show each product in a purchase with its brand, name, and price, in product `id` order.
- [x] **PURCH-LIST-009**: The purchase list shall show every amount as US dollars with two decimal places, such as `$32.00`.
- [x] **PURCH-LIST-010**: While no product record has a purchase, the purchase list shall show "No purchases yet."
- [x] **PURCH-LIST-011**: While a product in a purchase has a `shade`, the purchase list shall show ` – ` (space, en dash, space) and the shade immediately after that product's name, all in the same text style as the name.
- [ ] **PURCH-LIST-012**: The purchase list shall show an "Edit" button on each purchase.
- [ ] **PURCH-LIST-013**: The purchase list shall give each purchase's "Edit" button the accessible name "Edit purchase", a space, and the purchase's date as shown in the list, followed, when the purchase has a store, by ` · ` and the store, such as `Edit purchase Nov 7, 2026 · Sephora`.

## Purchase Dialog

- [x] **PURCH-DLG-001**: When the user activates "Add purchase", the page shall open the purchase dialog to add a purchase.
- [x] **PURCH-DLG-002**: When the purchase dialog opens to add a purchase, the dialog shall show today's local date, an empty store, and one item with no product chosen and an empty price.
- [x] **PURCH-DLG-003**: The purchase dialog's date input shall not offer dates after today's local date.
- [x] **PURCH-DLG-004**: The purchase dialog's store input shall suggest each distinct store recorded on a product's purchase.
- [x] **PURCH-DLG-005**: When the user activates "Add item" in the purchase dialog, the dialog shall add an item with no product chosen and an empty price after the existing items.
- [x] **PURCH-DLG-006**: When the user activates an item's remove control in the purchase dialog, the dialog shall remove that item.
- [x] **PURCH-DLG-007**: While the purchase dialog has one item, the dialog shall disable that item's remove control.
- [x] **PURCH-DLG-008**: Each item's product dropdown in the purchase dialog shall list the products that have no purchase, are not finished (PROD-011), and are not chosen on another item.
- [x] **PURCH-DLG-029**: Each item's product dropdown in the purchase dialog shall list the product chosen on that item, whether or not it has a purchase or is finished.
- [x] **PURCH-DLG-009**: Each item's product dropdown in the purchase dialog shall list products in sections labeled with their category name, ordered by group and then by category in configured order, with no section for a category that has no product to list.
- [x] **PURCH-DLG-010**: Each item's product dropdown in the purchase dialog shall list products whose category is not configured after all configured categories, under "Other".
- [x] **PURCH-DLG-011**: Each item's product dropdown in the purchase dialog shall label each product with its brand followed by its name.
- [x] **PURCH-DLG-028**: While a product listed in an item's product dropdown in the purchase dialog has a `shade`, the dropdown shall label that product with its brand, its name, ` – ` (space, en dash, space), and the shade, in that order.
- [x] **PURCH-DLG-012**: Each item's product dropdown in the purchase dialog shall end with a "New product" option.
- [x] **PURCH-DLG-013**: When the user chooses "New product" on an item, the page shall open the product dialog to add a product over the purchase dialog.
- [x] **PURCH-DLG-014**: When the product dialog opened from an item adds a product, the purchase dialog shall choose that product on that item.
- [x] **PURCH-DLG-015**: When the product dialog opened from an item closes without adding a product, the purchase dialog shall keep the product the item had before "New product" was chosen.
- [x] **PURCH-DLG-016**: While an item's price is not blank and, ignoring surrounding whitespace and one leading `$`, is not digits with an optional decimal point and at most two decimal places (such as `32`, `32.`, `32.5`, `32.50`, or `.99`), the purchase dialog shall mark that price input invalid.
- [x] **PURCH-DLG-017**: The purchase dialog shall show the sum of the valid prices entered as the purchase total.
- [x] **PURCH-DLG-018**: While any item in the purchase dialog has no product chosen, the dialog shall disable Save.
- [x] **PURCH-DLG-019**: While any item's price in the purchase dialog is blank or invalid, the dialog shall disable Save.
- [x] **PURCH-DLG-020**: While the purchase dialog's date is empty or after today's local date, the dialog shall disable Save.
- [x] **PURCH-DLG-021**: While a save from the purchase dialog is in flight, the dialog shall disable Save.
- [x] **PURCH-DLG-022**: When the user activates Cancel in the purchase dialog, the page shall close the dialog without sending any request.
- [x] **PURCH-DLG-023**: When the user presses Esc or activates the close control in the purchase dialog, the page shall close the dialog without sending any request.
- [x] **PURCH-DLG-024**: When the user clicks outside the purchase dialog, the page shall keep the dialog open.
- [x] **PURCH-DLG-025**: While a save from the purchase dialog is in flight, the page shall ignore Cancel, Esc, and the close control.
- [x] **PURCH-DLG-026**: While the product dialog is open over the purchase dialog, when the user presses Esc, the page shall close the product dialog and keep the purchase dialog open.
- [x] **PURCH-DLG-027**: When the page's loaders revalidate while the purchase dialog is open, the dialog shall keep the contents of its fields.

### Editing a Purchase

- [ ] **PURCH-DLG-030**: When the user activates a purchase's "Edit" button, the page shall open the purchase dialog to edit that purchase.
- [ ] **PURCH-DLG-031**: While the purchase dialog is open to add a purchase, the dialog shall show the title "Add purchase".
- [ ] **PURCH-DLG-032**: While the purchase dialog is open to edit a purchase, the dialog shall show the title "Edit purchase".
- [ ] **PURCH-DLG-033**: When the purchase dialog opens to edit a purchase, the dialog shall show the purchase's date, the purchase's store or an empty store when it has none, and one item per product in the purchase in product `id` order, each with that product chosen and its price as dollars with two decimal places, such as `32.00`.
- [ ] **PURCH-DLG-034**: While the purchase dialog is open to edit a purchase, each item's product dropdown shall also list each product the purchase had when the dialog opened that is not chosen on another item, whether or not it is finished (PROD-011).
- [ ] **PURCH-DLG-035**: While the purchase dialog is open to edit a purchase, the dialog shall show a Delete button.
- [ ] **PURCH-DLG-036**: While the purchase dialog is open to add a purchase, the dialog shall not show a Delete button.
- [ ] **PURCH-DLG-037**: When the user activates Delete in the purchase dialog, the page shall open a confirmation over the purchase dialog asking "Delete this purchase?", stating that its products will have no purchase, with Delete and Cancel buttons.
- [ ] **PURCH-DLG-038**: When the user activates Cancel, presses Esc, or activates the close control in the delete confirmation, the page shall close the confirmation and keep the purchase dialog open with its contents.
- [ ] **PURCH-DLG-039**: While a save or delete from the purchase dialog is in flight, the dialog shall disable Delete.
- [ ] **PURCH-DLG-040**: While a delete from the purchase dialog is in flight, the dialog shall disable Save.
- [ ] **PURCH-DLG-041**: While a delete from the purchase dialog is in flight, the page shall ignore Cancel, Esc, and the close control of the purchase dialog.
- [ ] **PURCH-DLG-043**: When the user clicks outside the delete confirmation, the page shall keep the confirmation open.
- [ ] **PURCH-DLG-044**: While a delete from the delete confirmation is in flight, the page shall ignore the confirmation's Cancel, Esc, and close control.
- [ ] **PURCH-DLG-042**: When the page's loaders revalidate while the purchase dialog is open to edit a purchase, the dialog shall keep, as the products its save and delete name, the products the purchase had when the dialog opened.

## Saving a Purchase

- [x] **PURCH-SAVE-001**: When the purchase dialog saves a purchase being added, the page shall send a POST to `/api/purchases` with the date and, for each item in order, the product's id and the price converted to whole cents.
- [ ] **PURCH-SAVE-002**: When the purchase dialog saves with a store that is not blank after trimming, the page shall include the trimmed store in the request body.
- [ ] **PURCH-SAVE-003**: When the purchase dialog saves with a store that is blank after trimming, the page shall omit `store` from the request body.
- [ ] **PURCH-SAVE-010**: When the purchase dialog saves a purchase being edited, the page shall send a PUT to `/api/purchases` with `replaces` listing the ids of the products the purchase had when the dialog opened, the date, and, for each item in order, the product's id and the price converted to whole cents.
- [ ] **PURCH-SAVE-011**: When the user activates Delete in the delete confirmation, the page shall send a DELETE to `/api/purchases` with `productIds` listing the ids of the products the purchase had when the purchase dialog opened.
- [ ] **PURCH-SAVE-004**: When a request to `/api/purchases` from the purchase dialog succeeds, the page shall close the dialog.
- [ ] **PURCH-SAVE-005**: When a request to `/api/purchases` from the purchase dialog succeeds, the page shall revalidate its loaders.
- [ ] **PURCH-SAVE-006**: If a request to `/api/purchases` from the purchase dialog fails, then the page shall keep the dialog open with its current contents.
- [ ] **PURCH-SAVE-012**: If the DELETE to `/api/purchases` from the delete confirmation fails, then the page shall close the confirmation.
- [ ] **PURCH-SAVE-007**: If a request to `/api/purchases` from the purchase dialog responds with an error status and a JSON body with a non-empty string `error`, then the page shall show an error notification containing that message.
- [ ] **PURCH-SAVE-008**: If a request to `/api/purchases` from the purchase dialog responds with an error status and no JSON body with a non-empty string `error`, then the page shall show an error notification stating that the change was not saved.
- [ ] **PURCH-SAVE-009**: If a request to `/api/purchases` from the purchase dialog gets no response, then the page shall show an error notification stating that the change was not saved.

## Purchase API

- [x] **PURCH-API-001**: When `/api/purchases` receives a POST whose body passes validation, the system shall set the `purchase` of each item's product record to the body's date, the body's store when present, and the item's price.
- [x] **PURCH-API-002**: When `/api/purchases` applies a POST that passes validation, the system shall leave every other field of the named product records, and every other product record, unchanged.
- [x] **PURCH-API-003**: When `/api/purchases` applies a POST that passes validation, the system shall write `usage.json` once.
- [x] **PURCH-API-004**: If a body to `/api/purchases` is not valid JSON or is not a JSON object, then the system shall treat the body as failing validation.
- [x] **PURCH-API-005**: If a POST body to `/api/purchases` lacks `date` or `items`, or contains a top-level key other than `date`, `store`, and `items`, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-006**: If `date` in a POST or PUT body to `/api/purchases` is not a real calendar date in `YYYY-MM-DD` form, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-007**: If `date` in a POST or PUT body to `/api/purchases` is after the server's current local date, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-008**: If a POST or PUT body to `/api/purchases` has a `store` that is not a string containing a non-whitespace character with no leading or trailing whitespace, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-009**: If `items` in a POST or PUT body to `/api/purchases` is not a non-empty array, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-010**: If an item in a POST or PUT body to `/api/purchases` is not an object with exactly the keys `productId` and `price`, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-011**: If an item's `price` in a POST or PUT body to `/api/purchases` is not an integer of 0 or more, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-012**: If an item's `productId` in a POST or PUT body to `/api/purchases` is not an integer matching a product record's `id`, then the system shall treat the body as failing validation.
- [x] **PURCH-API-013**: If an item's `productId` in a POST body to `/api/purchases` names a product record that already has a `purchase`, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-014**: If two items in a POST or PUT body to `/api/purchases` have the same `productId`, then the system shall treat the body as failing validation.
- [x] **PURCH-API-015**: If a body to `/api/purchases` fails validation, then the system shall respond with 400 and a JSON body of the form `{ "error": "<message>" }` describing the first failure found.
- [x] **PURCH-API-016**: If a body to `/api/purchases` fails validation, then the system shall leave `usage.json` unchanged.
- [ ] **PURCH-API-017**: If a POST, PUT, or DELETE to `/api/purchases` cannot complete because `usage.json` cannot be read or written, then the system shall respond with 500 and a JSON body of the form `{ "error": "<message>" }`.
- [ ] **PURCH-API-018**: If a POST, PUT, or DELETE to `/api/purchases` cannot complete because `usage.json` cannot be read or written, then the system shall leave `usage.json` unchanged.
- [x] **PURCH-API-019**: When `/api/purchases` receives overlapping POST requests that pass validation on their own and name the same product, the system shall apply only the first and reject the others as failing validation.
- [ ] **PURCH-API-020**: If `/api/purchases` receives a PATCH request, then the system shall respond with 405 and a JSON body of the form `{ "error": "<message>" }`.
- [ ] **PURCH-API-021**: If `/api/purchases` receives a PATCH request, then the system shall leave `usage.json` unchanged.
- [ ] **PURCH-API-022**: When `/api/purchases` validates a POST, PUT, or DELETE body, the system shall not treat any product it names as failing validation because that product is finished (PROD-011).

### Editing and Deleting

- [ ] **PURCH-API-023**: When `/api/purchases` receives a PUT whose body passes validation, the system shall set the `purchase` of each item's product record to the body's date, the body's store when present, and the item's price.
- [ ] **PURCH-API-024**: When `/api/purchases` receives a PUT whose body passes validation, the system shall remove the `purchase` field from each product record named in `replaces` that no item names.
- [ ] **PURCH-API-025**: When `/api/purchases` receives a DELETE whose body passes validation, the system shall remove the `purchase` field from each product record named in `productIds`.
- [ ] **PURCH-API-026**: When `/api/purchases` applies a PUT or DELETE that passes validation, the system shall leave every other field of the named product records, and every product record the body does not name, unchanged.
- [ ] **PURCH-API-027**: When `/api/purchases` applies a PUT or DELETE that passes validation, the system shall write `usage.json` once.
- [ ] **PURCH-API-028**: If a PUT body to `/api/purchases` lacks `replaces`, `date`, or `items`, or contains a top-level key other than `replaces`, `date`, `store`, and `items`, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-029**: If a DELETE body to `/api/purchases` lacks `productIds`, or contains a top-level key other than `productIds`, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-030**: If `replaces` in a PUT body or `productIds` in a DELETE body to `/api/purchases` is not a non-empty array of integers, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-031**: If `replaces` in a PUT body or `productIds` in a DELETE body to `/api/purchases` contains the same id more than once, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-032**: If `replaces` in a PUT body or `productIds` in a DELETE body to `/api/purchases` contains an id matching no product record, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-033**: If `replaces` in a PUT body or `productIds` in a DELETE body to `/api/purchases` names a product record that has no `purchase`, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-034**: If the product records named by `replaces` in a PUT body or `productIds` in a DELETE body to `/api/purchases` do not all have the same purchase date, or do not all have the same store, or include both records with a store and records with no store, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-035**: If an item's `productId` in a PUT body to `/api/purchases` names a product record that has a `purchase` and is not named in `replaces`, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-036**: When `/api/purchases` receives overlapping POST, PUT, or DELETE requests, the system shall validate and apply each against the product records as left by the requests applied before it.
