# Purchases Specs

EARS requirements for the purchases segment. Design: [purchases-design.md](purchases-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet implemented, or implemented but not yet covered by tests, `[D]` deferred.

## Purchase Field

- [ ] **PURCH-001**: The system shall store a product's purchase in an optional `purchase` field on its product record, holding the purchase date in `YYYY-MM-DD` form, an optional store name, and the price paid as an integer number of cents.

## Purchase List

- [ ] **PURCH-LIST-001**: The purchase list shall show an "Add purchase" button.
- [ ] **PURCH-LIST-002**: The purchase list shall show the products whose purchases have the same date and the same store, or the same date and no store, as one purchase.
- [ ] **PURCH-LIST-003**: The purchase list shall order purchases by date, newest first.
- [ ] **PURCH-LIST-004**: The purchase list shall order purchases with the same date by store name in alphabetical order ignoring capitalization, with the purchase that has no store last.
- [ ] **PURCH-LIST-005**: The purchase list shall show each purchase's date as the month abbreviation, day, and year, such as `Nov 7, 2026`.
- [ ] **PURCH-LIST-006**: The purchase list shall show each purchase's store when it has one.
- [ ] **PURCH-LIST-007**: The purchase list shall show each purchase's total, the sum of its products' prices.
- [ ] **PURCH-LIST-008**: The purchase list shall show each product in a purchase with its brand, name, and price, in product `id` order.
- [ ] **PURCH-LIST-009**: The purchase list shall show every amount as US dollars with two decimal places, such as `$32.00`.
- [ ] **PURCH-LIST-010**: While no product record has a purchase, the purchase list shall show "No purchases yet."

## Purchase Dialog

- [ ] **PURCH-DLG-001**: When the user activates "Add purchase", the page shall open the purchase dialog.
- [ ] **PURCH-DLG-002**: When the purchase dialog opens, the dialog shall show today's local date, an empty store, and one item with no product chosen and an empty price.
- [ ] **PURCH-DLG-003**: The purchase dialog's date input shall not offer dates after today's local date.
- [ ] **PURCH-DLG-004**: The purchase dialog's store input shall suggest each distinct store recorded on a product's purchase.
- [ ] **PURCH-DLG-005**: When the user activates "Add item" in the purchase dialog, the dialog shall add an item with no product chosen and an empty price after the existing items.
- [ ] **PURCH-DLG-006**: When the user activates an item's remove control in the purchase dialog, the dialog shall remove that item.
- [ ] **PURCH-DLG-007**: While the purchase dialog has one item, the dialog shall disable that item's remove control.
- [ ] **PURCH-DLG-008**: Each item's product dropdown in the purchase dialog shall list the products that have no purchase and are not chosen on another item, including the product chosen on that item.
- [ ] **PURCH-DLG-009**: Each item's product dropdown in the purchase dialog shall list products in sections labeled with their category name, ordered by group and then by category in configured order, with no section for a category that has no product to list.
- [ ] **PURCH-DLG-010**: Each item's product dropdown in the purchase dialog shall list products whose category is not configured after all configured categories, under "Other".
- [ ] **PURCH-DLG-011**: Each item's product dropdown in the purchase dialog shall label each product with its brand followed by its name.
- [ ] **PURCH-DLG-012**: Each item's product dropdown in the purchase dialog shall end with a "New product" option.
- [ ] **PURCH-DLG-013**: When the user chooses "New product" on an item, the page shall open the product dialog to add a product over the purchase dialog.
- [ ] **PURCH-DLG-014**: When the product dialog opened from an item adds a product, the purchase dialog shall choose that product on that item.
- [ ] **PURCH-DLG-015**: When the product dialog opened from an item closes without adding a product, the purchase dialog shall keep the product the item had before "New product" was chosen.
- [ ] **PURCH-DLG-016**: While an item's price is not blank and, ignoring surrounding whitespace and one leading `$`, is not digits with an optional decimal point and at most two decimal places (such as `32`, `32.`, `32.5`, `32.50`, or `.99`), the purchase dialog shall mark that price input invalid.
- [ ] **PURCH-DLG-017**: The purchase dialog shall show the sum of the valid prices entered as the purchase total.
- [ ] **PURCH-DLG-018**: While any item in the purchase dialog has no product chosen, the dialog shall disable Save.
- [ ] **PURCH-DLG-019**: While any item's price in the purchase dialog is blank or invalid, the dialog shall disable Save.
- [ ] **PURCH-DLG-020**: While the purchase dialog's date is empty or after today's local date, the dialog shall disable Save.
- [ ] **PURCH-DLG-021**: While a save from the purchase dialog is in flight, the dialog shall disable Save.
- [ ] **PURCH-DLG-022**: When the user activates Cancel in the purchase dialog, the page shall close the dialog without sending any request.
- [ ] **PURCH-DLG-023**: When the user presses Esc or activates the close control in the purchase dialog, the page shall close the dialog without sending any request.
- [ ] **PURCH-DLG-024**: When the user clicks outside the purchase dialog, the page shall keep the dialog open.
- [ ] **PURCH-DLG-025**: While a save from the purchase dialog is in flight, the page shall ignore Cancel, Esc, and the close control.
- [ ] **PURCH-DLG-026**: While the product dialog is open over the purchase dialog, when the user presses Esc, the page shall close the product dialog and keep the purchase dialog open.
- [ ] **PURCH-DLG-027**: When the page's loaders revalidate while the purchase dialog is open, the dialog shall keep the contents of its fields.

## Saving a Purchase

- [ ] **PURCH-SAVE-001**: When the purchase dialog saves, the page shall send a POST to `/api/purchases` with the date and, for each item in order, the product's id and the price converted to whole cents.
- [ ] **PURCH-SAVE-002**: When the purchase dialog saves with a store that is not blank after trimming, the page shall include the trimmed store in the POST body.
- [ ] **PURCH-SAVE-003**: When the purchase dialog saves with a store that is blank after trimming, the page shall omit `store` from the POST body.
- [ ] **PURCH-SAVE-004**: When the POST to `/api/purchases` from the purchase dialog succeeds, the page shall close the dialog.
- [ ] **PURCH-SAVE-005**: When the POST to `/api/purchases` from the purchase dialog succeeds, the page shall revalidate its loaders.
- [ ] **PURCH-SAVE-006**: If the POST to `/api/purchases` from the purchase dialog fails, then the page shall keep the dialog open with its current contents.
- [ ] **PURCH-SAVE-007**: If the POST to `/api/purchases` responds with an error status and a JSON body with a non-empty string `error`, then the page shall show an error notification containing that message.
- [ ] **PURCH-SAVE-008**: If the POST to `/api/purchases` responds with an error status and no JSON body with a non-empty string `error`, then the page shall show an error notification stating that the change was not saved.
- [ ] **PURCH-SAVE-009**: If the POST to `/api/purchases` gets no response, then the page shall show an error notification stating that the change was not saved.

## Purchase API

- [ ] **PURCH-API-001**: When `/api/purchases` receives a POST whose body passes validation, the system shall set the `purchase` of each item's product record to the body's date, the body's store when present, and the item's price.
- [ ] **PURCH-API-002**: When `/api/purchases` applies a POST that passes validation, the system shall leave every other field of the named product records, and every other product record, unchanged.
- [ ] **PURCH-API-003**: When `/api/purchases` applies a POST that passes validation, the system shall write `usage.json` once.
- [ ] **PURCH-API-004**: If a body to `/api/purchases` is not valid JSON or is not a JSON object, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-005**: If a body to `/api/purchases` lacks `date` or `items`, or contains a top-level key other than `date`, `store`, and `items`, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-006**: If `date` in a body to `/api/purchases` is not a real calendar date in `YYYY-MM-DD` form, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-007**: If `date` in a body to `/api/purchases` is after the server's current local date, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-008**: If a body to `/api/purchases` has a `store` that is not a string containing a non-whitespace character with no leading or trailing whitespace, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-009**: If `items` in a body to `/api/purchases` is not a non-empty array, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-010**: If an item in a body to `/api/purchases` is not an object with exactly the keys `productId` and `price`, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-011**: If an item's `price` in a body to `/api/purchases` is not an integer of 0 or more, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-012**: If an item's `productId` in a body to `/api/purchases` is not an integer matching a product record's `id`, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-013**: If an item's `productId` in a body to `/api/purchases` names a product record that already has a `purchase`, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-014**: If two items in a body to `/api/purchases` have the same `productId`, then the system shall treat the body as failing validation.
- [ ] **PURCH-API-015**: If a body to `/api/purchases` fails validation, then the system shall respond with 400 and a JSON body of the form `{ "error": "<message>" }` describing the first failure found.
- [ ] **PURCH-API-016**: If a body to `/api/purchases` fails validation, then the system shall leave `usage.json` unchanged.
- [ ] **PURCH-API-017**: If a POST to `/api/purchases` cannot complete because `usage.json` cannot be read or written, then the system shall respond with 500 and a JSON body of the form `{ "error": "<message>" }`.
- [ ] **PURCH-API-018**: If a POST to `/api/purchases` cannot complete because `usage.json` cannot be read or written, then the system shall leave `usage.json` unchanged.
- [ ] **PURCH-API-019**: When `/api/purchases` receives overlapping POST requests that pass validation on their own and name the same product, the system shall apply only the first and reject the others as failing validation.
- [ ] **PURCH-API-020**: If `/api/purchases` receives a PUT, PATCH, or DELETE request, then the system shall respond with 405 and a JSON body of the form `{ "error": "<message>" }`.
- [ ] **PURCH-API-021**: If `/api/purchases` receives a PUT, PATCH, or DELETE request, then the system shall leave `usage.json` unchanged.
