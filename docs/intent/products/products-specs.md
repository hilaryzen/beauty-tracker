# Products Specs

EARS requirements for the products segment. Design: [products-design.md](products-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet implemented, or implemented but not yet covered by tests, `[D]` deferred.

## Product Record

- [x] **PROD-001**: The system shall store each tracked product as a record with an integer id, name, brand, category, a map of closed-month use counts keyed by `YYYY-MM`, a current month in `YYYY-MM` form, and a use count for that current month.
- [x] **PROD-002**: The system shall locate a product record by its `id` field, independent of the record's position in `usage.json`.

## Product Dialog

- [ ] **PROD-EDIT-001**: When the product dialog opens to add a product, the dialog shall show an empty name, an empty brand, and no category chosen.
- [ ] **PROD-EDIT-002**: When the product dialog opens to edit a product, the dialog shall show that product's name, brand, and category.
- [ ] **PROD-EDIT-003**: While the product dialog is open, the page shall prevent interaction with the usage table and routine cards.
- [ ] **PROD-EDIT-004**: The product dialog's category dropdown shall list the configured categories under their groups, in configured order, followed by a "New category" option.
- [ ] **PROD-EDIT-005**: When the user chooses "New category" in the product dialog, the dialog shall show a category name input and a group dropdown listing the existing groups in configured order, followed by a "New group" option.
- [ ] **PROD-EDIT-006**: When the user chooses "New group" in the product dialog, the dialog shall show a group name input.
- [ ] **PROD-EDIT-007**: While any shown name, brand, category name, or group name input in the product dialog is blank after trimming, the dialog shall disable Save.
- [ ] **PROD-EDIT-008**: While no category, or no group for a new category, is chosen in the product dialog, the dialog shall disable Save.
- [ ] **PROD-EDIT-009**: While a save from the product dialog is in flight, the dialog shall disable Save.
- [ ] **PROD-EDIT-010**: When the user activates Cancel in the product dialog, the page shall close the dialog without sending any request.
- [ ] **PROD-EDIT-011**: When the product dialog saves, the page shall trim leading and trailing whitespace from every text input before using its value.

## Saving a Product

- [ ] **PROD-SAVE-001**: When the product dialog saves with a typed category name that matches no configured category ignoring capitalization, the page shall send a POST to `/api/configs` with a `categories` value equal to the current categories plus the new category at the end of its group, before any request to `/api/products`.
- [ ] **PROD-SAVE-002**: When the product dialog saves with a typed group name that matches no existing group ignoring capitalization, the page shall place the new group after the existing groups in the `categories` value it sends.
- [ ] **PROD-SAVE-003**: When the product dialog saves with a typed group name that matches an existing group ignoring capitalization, the page shall add the new category to that existing group.
- [ ] **PROD-SAVE-004**: When the product dialog saves with a typed category name that matches a configured category ignoring capitalization, the page shall use the configured category's spelling for the product and shall send no request to `/api/configs`.
- [ ] **PROD-SAVE-005**: When the product dialog saves a new product and no category request is needed or the category request has succeeded, the page shall send a POST to `/api/products` with the name, brand, and category.
- [ ] **PROD-SAVE-006**: When the product dialog saves an existing product and no category request is needed or the category request has succeeded, the page shall send a PUT to `/api/products` with the id, name, brand, and category.
- [ ] **PROD-SAVE-007**: If the POST to `/api/configs` from the product dialog fails, then the page shall send no request to `/api/products`.
- [ ] **PROD-SAVE-008**: When a request to `/api/products` from the product dialog succeeds, the page shall close the dialog.
- [ ] **PROD-SAVE-009**: When a request to `/api/products` from the product dialog succeeds, the page shall revalidate its loaders.
- [ ] **PROD-SAVE-010**: If a request from the product dialog fails, then the page shall keep the dialog open with its current contents.
- [ ] **PROD-SAVE-011**: If a request from the product dialog responds with an error status, then the page shall show an error notification containing the server's error message.
- [ ] **PROD-SAVE-012**: If a request from the product dialog gets no response, then the page shall show an error notification stating that the change was not saved.
- [ ] **PROD-SAVE-013**: If the POST to `/api/configs` from the product dialog succeeds and the request to `/api/products` fails, then the page shall revalidate its loaders.

## Product API

- [ ] **PROD-API-001**: When `/api/products` receives a POST whose body passes validation, the system shall append a new product record with the body's name, brand, and category.
- [ ] **PROD-API-002**: When `/api/products` adds a product record, the system shall assign it an id one higher than the highest existing id, or 0 if there are no product records.
- [ ] **PROD-API-003**: When `/api/products` adds a product record, the system shall set its closed-month use counts to empty, its current month to the server's current local month, and its current-month use count to 0.
- [ ] **PROD-API-004**: When `/api/products` receives a PUT whose body passes validation, the system shall replace the name, brand, and category of the product record whose `id` matches the body's `id`.
- [ ] **PROD-API-005**: When `/api/products` receives a PUT whose body passes validation, the system shall leave that product record's id, closed-month use counts, current month, and current-month use count unchanged.
- [ ] **PROD-API-006**: When `/api/products` applies a POST or PUT that passes validation, the system shall write `usage.json` once.
- [ ] **PROD-API-007**: If a POST body to `/api/products` lacks `name`, `brand`, or `category`, or contains any other top-level key, then the system shall treat the body as failing validation.
- [ ] **PROD-API-008**: If a PUT body to `/api/products` lacks `id`, `name`, `brand`, or `category`, or contains any other top-level key, then the system shall treat the body as failing validation.
- [ ] **PROD-API-009**: If `name` or `brand` in a body to `/api/products` is not a string containing a non-whitespace character with no leading or trailing whitespace, then the system shall treat the body as failing validation.
- [ ] **PROD-API-010**: If `category` in a body to `/api/products` is not a category listed in `configs.json → categories`, then the system shall treat the body as failing validation.
- [ ] **PROD-API-011**: If `id` in a PUT body to `/api/products` matches no product record, then the system shall treat the body as failing validation.
- [ ] **PROD-API-012**: If a body to `/api/products` is not valid JSON or is not a JSON object, then the system shall treat the body as failing validation.
- [ ] **PROD-API-013**: If a body to `/api/products` fails validation, then the system shall respond with 400 and a JSON body of the form `{ "error": "<message>" }` describing the first failure found.
- [ ] **PROD-API-014**: If a body to `/api/products` fails validation, then the system shall leave `usage.json` unchanged.
- [ ] **PROD-API-015**: If a POST or PUT to `/api/products` cannot complete because `usage.json` or `configs.json` cannot be read, or `usage.json` cannot be written, then the system shall respond with 500 and a JSON body of the form `{ "error": "<message>" }`.
- [ ] **PROD-API-016**: If a POST or PUT to `/api/products` cannot complete because `usage.json` or `configs.json` cannot be read, or `usage.json` cannot be written, then the system shall leave `usage.json` unchanged.

## Categories

- [x] **PROD-CAT-001**: When a `categories` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation unless it is an object whose values are arrays (possibly empty) of strings.
- [x] **PROD-CAT-002**: When a `categories` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any category name appears more than once across all groups.
- [x] **PROD-CAT-003**: When a `categories` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if it omits a category that any product record in `usage.json` uses.
- [ ] **PROD-CAT-004**: When a `categories` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any group name or category name contains no non-whitespace character or has leading or trailing whitespace.
