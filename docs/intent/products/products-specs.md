# Products Specs

EARS requirements for the products segment. Design: [products-design.md](products-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet implemented, or implemented but not yet covered by tests, `[D]` deferred.

## Product Record

- [x] **PROD-001**: The system shall store each tracked product as a record with an integer id, name, brand, category, a map of closed-month use counts keyed by `YYYY-MM`, a current month in `YYYY-MM` form, and a use count for that current month.
- [x] **PROD-002**: The system shall locate a product record by its `id` field, independent of the record's position in `usage.json`.
- [x] **PROD-003**: The system shall allow a product record to carry an optional `purchase` field.
- [x] **PROD-004**: The system shall allow a product record to carry an optional `shade` field.
- [ ] **PROD-005**: The system shall allow a product record to carry optional `opened`, `expires`, and `removed` fields, each a date in `YYYY-MM-DD` form.

## Product Dialog

- [x] **PROD-EDIT-001**: When the product dialog opens to add a product, the dialog shall show an empty name, an empty shade, an empty brand, and no category chosen.
- [x] **PROD-EDIT-002**: When the product dialog opens to edit a product, the dialog shall show that product's name, shade (empty if the product has none), brand, and category.
- [x] **PROD-EDIT-003**: While the product dialog is open, the page shall prevent interaction with the usage table and routine cards.
- [x] **PROD-EDIT-004**: The product dialog's category dropdown shall list the configured categories under their groups, in configured order, followed by a "New category" option.
- [x] **PROD-EDIT-005**: When the user chooses "New category" in the product dialog, the dialog shall show a new category name input and a group dropdown listing the existing groups in configured order, followed by a "New group" option.
- [x] **PROD-EDIT-006**: When the user chooses "New group" in the product dialog, the dialog shall show a new group name input.
- [x] **PROD-EDIT-007**: While any shown name, brand, new category name, or new group name input in the product dialog is blank after trimming, the dialog shall disable Save.
- [x] **PROD-EDIT-008**: While no category, or no group for a new category, is chosen in the product dialog, the dialog shall disable Save.
- [x] **PROD-EDIT-009**: While a save from the product dialog is in flight, the dialog shall disable Save.
- [x] **PROD-EDIT-010**: When the user activates Cancel in the product dialog, the page shall close the dialog without sending any request.
- [x] **PROD-EDIT-011**: When the product dialog saves, the page shall trim leading and trailing whitespace from every text input before using its value.
- [x] **PROD-EDIT-012**: While the typed category name in the product dialog matches a configured category ignoring capitalization, the dialog shall show that category's group in the group dropdown.
- [x] **PROD-EDIT-013**: While the typed category name in the product dialog matches a configured category ignoring capitalization, the dialog shall disable the group dropdown.
- [x] **PROD-EDIT-014**: While the typed category name in the product dialog matches a configured category ignoring capitalization, the dialog shall not show the new group name input.
- [x] **PROD-EDIT-015**: When the user presses Esc or activates the close control in the product dialog, the page shall close the dialog without sending any request.
- [x] **PROD-EDIT-016**: When the user clicks outside the product dialog, the page shall keep the dialog open.
- [x] **PROD-EDIT-017**: While a save from the product dialog is in flight, the page shall ignore Cancel, Esc, and the close control.
- [x] **PROD-EDIT-018**: When the page's loaders revalidate while the product dialog is open, the dialog shall keep the contents of its fields.
- [x] **PROD-EDIT-019**: The product dialog shall show its name, shade, brand, and category inputs in that order.
- [x] **PROD-EDIT-020**: The product dialog shall not disable Save because the shade input is blank.
- [ ] **PROD-EDIT-021**: The product dialog shall show a date opened, a date expiring, and a date removed date picker, in that order, after its category input.
- [ ] **PROD-EDIT-022**: When the product dialog opens to add a product, the dialog shall show the date opened, date expiring, and date removed pickers empty.
- [ ] **PROD-EDIT-023**: When the product dialog opens to edit a product, the dialog shall show the product's `opened`, `expires`, and `removed` dates in the date opened, date expiring, and date removed pickers respectively, leaving a picker empty where the product has no such date.
- [ ] **PROD-EDIT-024**: The product dialog's date opened and date removed pickers shall not offer dates after today's local date.
- [ ] **PROD-EDIT-025**: While the product dialog's date opened or date removed picker holds a date after today's local date, the dialog shall disable Save.
- [ ] **PROD-EDIT-026**: The product dialog shall not disable Save because the date opened, date expiring, or date removed picker is empty.

## Saving a Product

- [x] **PROD-SAVE-001**: When the product dialog saves with a typed category name that matches no configured category ignoring capitalization, the page shall send a POST to `/api/configs` with a `categories` value equal to the current categories plus the new category at the end of its group, before any request to `/api/products`.
- [x] **PROD-SAVE-002**: When the product dialog saves with a typed group name that matches no existing group ignoring capitalization, the page shall place the new group after the existing groups in the `categories` value it sends.
- [x] **PROD-SAVE-003**: When the product dialog saves with a typed group name that matches an existing group ignoring capitalization, the page shall add the new category to that existing group.
- [x] **PROD-SAVE-004**: When the product dialog saves with a typed category name that matches a configured category ignoring capitalization, the page shall use the configured category's spelling for the product and shall send no request to `/api/configs`.
- [x] **PROD-SAVE-005**: When the product dialog saves a new product and no category request is needed or the category request has succeeded, the page shall send a POST to `/api/products` with the name, brand, and category.
- [x] **PROD-SAVE-006**: When the product dialog saves an existing product and no category request is needed or the category request has succeeded, the page shall send a PUT to `/api/products` with the id, name, brand, and category.
- [x] **PROD-SAVE-007**: If the POST to `/api/configs` from the product dialog fails, then the page shall send no request to `/api/products`.
- [x] **PROD-SAVE-008**: When a request to `/api/products` from the product dialog succeeds, the page shall close the dialog.
- [x] **PROD-SAVE-009**: When a request to `/api/products` from the product dialog succeeds, the page shall revalidate its loaders.
- [x] **PROD-SAVE-010**: If a request from the product dialog fails, then the page shall keep the dialog open with its current contents.
- [x] **PROD-SAVE-011**: If a request from the product dialog responds with an error status and a JSON body with a non-empty string `error`, then the page shall show an error notification containing that message.
- [x] **PROD-SAVE-012**: If a request from the product dialog gets no response, then the page shall show an error notification stating that the change was not saved.
- [x] **PROD-SAVE-013**: If the POST to `/api/configs` from the product dialog succeeds and the request to `/api/products` fails, then the page shall revalidate its loaders.
- [x] **PROD-SAVE-014**: If a request from the product dialog responds with an error status and no JSON body with a non-empty string `error`, then the page shall show an error notification stating that the change was not saved.
- [x] **PROD-SAVE-015**: When a POST to `/api/products` from the product dialog succeeds, the page shall report the new product's `id` to the component that opened the dialog after revalidating its loaders.
- [x] **PROD-SAVE-016**: When the product dialog sends a POST or PUT to `/api/products` and the trimmed shade is not blank, the page shall include the trimmed shade as `shade` in the request body.
- [x] **PROD-SAVE-017**: When the product dialog sends a POST or PUT to `/api/products` and the trimmed shade is blank, the page shall leave `shade` out of the request body.
- [ ] **PROD-SAVE-018**: When the product dialog sends a POST or PUT to `/api/products`, for each of the date opened, date expiring, and date removed pickers that holds a date, the page shall include that date in the request body as `opened`, `expires`, or `removed` respectively.
- [ ] **PROD-SAVE-019**: When the product dialog sends a POST or PUT to `/api/products`, for each of the date opened, date expiring, and date removed pickers that is empty, the page shall leave `opened`, `expires`, or `removed` respectively out of the request body.

## Product API

- [x] **PROD-API-001**: When `/api/products` receives a POST whose body passes validation, the system shall append a new product record with the body's name, brand, and category.
- [x] **PROD-API-002**: When `/api/products` adds a product record, the system shall assign it an id one higher than the highest existing id, or 0 if there are no product records.
- [x] **PROD-API-003**: When `/api/products` adds a product record, the system shall set its closed-month use counts to empty, its current month to the server's current local month, and its current-month use count to 0.
- [x] **PROD-API-004**: When `/api/products` receives a PUT whose body passes validation, the system shall replace the name, brand, and category of the product record whose `id` matches the body's `id`.
- [x] **PROD-API-005**: When `/api/products` receives a PUT whose body passes validation, the system shall leave that product record's id, closed-month use counts, current month, and current-month use count unchanged.
- [x] **PROD-API-006**: When `/api/products` applies a POST or PUT that passes validation, the system shall write `usage.json` once.
- [ ] **PROD-API-007**: If a POST body to `/api/products` lacks `name`, `brand`, or `category`, or contains any top-level key other than those, `shade`, `opened`, `expires`, and `removed`, then the system shall treat the body as failing validation.
- [ ] **PROD-API-008**: If a PUT body to `/api/products` lacks `id`, `name`, `brand`, or `category`, or contains any top-level key other than those, `shade`, `opened`, `expires`, and `removed`, then the system shall treat the body as failing validation.
- [x] **PROD-API-009**: If `name` or `brand` in a body to `/api/products` is not a string containing a non-whitespace character with no leading or trailing whitespace, then the system shall treat the body as failing validation.
- [x] **PROD-API-010**: If `category` in a body to `/api/products` is not a category listed in `configs.json → categories`, then the system shall treat the body as failing validation.
- [x] **PROD-API-011**: If `id` in a PUT body to `/api/products` is not an integer matching a product record's `id`, then the system shall treat the body as failing validation.
- [x] **PROD-API-012**: If a body to `/api/products` is not valid JSON or is not a JSON object, then the system shall treat the body as failing validation.
- [x] **PROD-API-013**: If a body to `/api/products` fails validation, then the system shall respond with 400 and a JSON body of the form `{ "error": "<message>" }` describing the first failure found.
- [x] **PROD-API-014**: If a body to `/api/products` fails validation, then the system shall leave `usage.json` unchanged.
- [x] **PROD-API-015**: If a POST or PUT to `/api/products` cannot complete because `usage.json` or `configs.json` cannot be read, or `usage.json` cannot be written, then the system shall respond with 500 and a JSON body of the form `{ "error": "<message>" }`.
- [x] **PROD-API-016**: If a POST or PUT to `/api/products` cannot complete because `usage.json` or `configs.json` cannot be read, or `usage.json` cannot be written, then the system shall leave `usage.json` unchanged.
- [x] **PROD-API-017**: When `/api/products` receives overlapping POST requests that pass validation, the system shall assign each new product record a different id.
- [x] **PROD-API-018**: If `/api/products` receives a PATCH or DELETE request, then the system shall respond with 405 and a JSON body of the form `{ "error": "<message>" }`.
- [x] **PROD-API-019**: If `/api/products` receives a PATCH or DELETE request, then the system shall leave `usage.json` unchanged.
- [x] **PROD-API-020**: When `/api/products` adds a product record, the system shall respond with a JSON body of the form `{ "id": <id> }` holding the new record's id.
- [x] **PROD-API-021**: When `/api/products` adds a product record, the system shall give it no `purchase` field.
- [x] **PROD-API-022**: When `/api/products` receives a PUT whose body passes validation, the system shall leave that product record's `purchase` field, or its absence, unchanged.
- [x] **PROD-API-023**: If a body to `/api/products` contains `shade` and it is not a string containing a non-whitespace character with no leading or trailing whitespace, then the system shall treat the body as failing validation.
- [x] **PROD-API-024**: When `/api/products` receives a POST whose body passes validation and contains `shade`, the system shall give the new product record the body's `shade`.
- [x] **PROD-API-025**: When `/api/products` receives a POST whose body passes validation and has no `shade`, the system shall give the new product record no `shade` field.
- [x] **PROD-API-026**: When `/api/products` receives a PUT whose body passes validation and contains `shade`, the system shall set the matching product record's `shade` to the body's `shade`.
- [x] **PROD-API-027**: When `/api/products` receives a PUT whose body passes validation and has no `shade`, the system shall remove the `shade` field from the matching product record.
- [x] **PROD-API-028**: When `/api/products` receives a POST or PUT, the system shall check the body's category against `configs.json` and write `usage.json` within one multi-file update holding both files.
- [ ] **PROD-API-029**: If a body to `/api/products` contains `opened`, `expires`, or `removed` and its value is not a string holding a real calendar date in `YYYY-MM-DD` form, then the system shall treat the body as failing validation.
- [ ] **PROD-API-030**: If a body to `/api/products` contains `opened` or `removed` and its value is a date after the server's current local date, then the system shall treat the body as failing validation.
- [ ] **PROD-API-031**: When `/api/products` receives a POST whose body passes validation, the system shall give the new product record each of `opened`, `expires`, and `removed` that the body contains, with the body's value.
- [ ] **PROD-API-032**: When `/api/products` receives a POST whose body passes validation, the system shall give the new product record no `opened`, `expires`, or `removed` field that the body does not contain.
- [ ] **PROD-API-033**: When `/api/products` receives a PUT whose body passes validation, the system shall set each of `opened`, `expires`, and `removed` that the body contains on the matching product record to the body's value.
- [ ] **PROD-API-034**: When `/api/products` receives a PUT whose body passes validation, the system shall remove from the matching product record each of `opened`, `expires`, and `removed` that the body does not contain.

## Categories

- [x] **PROD-CAT-001**: When a `categories` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation unless it is an object whose values are arrays (possibly empty) of strings.
- [x] **PROD-CAT-002**: When a `categories` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any category name appears more than once across all groups.
- [x] **PROD-CAT-003**: When a `categories` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if it omits a category that any product record in `usage.json` uses.
- [x] **PROD-CAT-004**: When a `categories` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any group name or category name contains no non-whitespace character or has leading or trailing whitespace.

## Category Editor

- [x] **PROD-CATEDIT-001**: The category editor shall show one section per configured group, in configured order, headed by the group name.
- [x] **PROD-CATEDIT-002**: The category editor shall list each group's categories within its section in configured order.
- [x] **PROD-CATEDIT-003**: The category editor shall show, beside each category, the number of product records whose `category` is that category, as `1 product` for one and `<n> products` otherwise.
- [x] **PROD-CATEDIT-004**: The category editor shall show Rename, Move up, Move down, and Delete controls for each group.
- [x] **PROD-CATEDIT-005**: The category editor shall show Rename, Move up, Move down, "Move to", and Delete controls for each category.
- [x] **PROD-CATEDIT-006**: The category editor's "Move to" dropdown for a category shall list every group other than the category's own, in configured order.
- [x] **PROD-CATEDIT-007**: The category editor shall end each group's section with a new category name input and an Add button.
- [x] **PROD-CATEDIT-008**: The category editor shall end with a new group name input and an Add group button, after every group's section.
- [x] **PROD-CATEDIT-009**: When the user activates Add in a group's section, the category editor shall send a POST to `/api/configs` with a `categories` value equal to the configured categories plus the trimmed new category name at the end of that group.
- [x] **PROD-CATEDIT-010**: When the user activates Add group, the category editor shall send a POST to `/api/configs` with a `categories` value equal to the configured categories plus an empty group with the trimmed new group name after the existing groups.
- [x] **PROD-CATEDIT-011**: When the user saves a group rename, the category editor shall send a POST to `/api/configs` with a `categories` value in which that group's name is replaced by the trimmed new name, keeping the group's position and categories.
- [x] **PROD-CATEDIT-012**: When the user activates Move up or Move down on a category, the category editor shall send a POST to `/api/configs` with a `categories` value in which that category has swapped places with the category before or after it in the same group.
- [x] **PROD-CATEDIT-013**: When the user activates Move up or Move down on a group, the category editor shall send a POST to `/api/configs` with a `categories` value in which that group has swapped places with the group before or after it.
- [x] **PROD-CATEDIT-014**: When the user chooses a group in a category's "Move to" dropdown, the category editor shall send a POST to `/api/configs` with a `categories` value in which that category is removed from its group and appended to the end of the chosen group.
- [x] **PROD-CATEDIT-015**: When the user activates Delete on a category, the category editor shall send a POST to `/api/configs` with a `categories` value equal to the configured categories without that category.
- [x] **PROD-CATEDIT-016**: When the user activates Delete on a group, the category editor shall send a POST to `/api/configs` with a `categories` value equal to the configured categories without that group.
- [x] **PROD-CATEDIT-017**: When the user saves a category rename, the category editor shall send a POST to `/api/categories` with a body of the form `{ "from": <current name>, "to": <trimmed new name> }`.
- [x] **PROD-CATEDIT-018**: While any product record uses a category, the category editor shall disable that category's Delete control.
- [x] **PROD-CATEDIT-019**: While a group contains at least one category, the category editor shall disable that group's Delete control.
- [x] **PROD-CATEDIT-020**: The category editor shall disable Move up on the first category of each group and on the first group.
- [x] **PROD-CATEDIT-021**: The category editor shall disable Move down on the last category of each group and on the last group.
- [x] **PROD-CATEDIT-022**: While only one group is configured, the category editor shall disable every category's "Move to" dropdown.
- [x] **PROD-CATEDIT-023**: While a group's new category name input is blank after trimming, the category editor shall disable that section's Add button.
- [x] **PROD-CATEDIT-024**: While a group's new category name input matches a configured category ignoring capitalization and surrounding whitespace, the category editor shall disable that section's Add button.
- [x] **PROD-CATEDIT-025**: While the new group name input is blank after trimming, the category editor shall disable Add group.
- [x] **PROD-CATEDIT-026**: While the new group name input matches an existing group name ignoring capitalization and surrounding whitespace, the category editor shall disable Add group.
- [x] **PROD-CATEDIT-027**: When the user activates Rename on a group or category, the category editor shall replace that name with a text input holding the current name, followed by Save and Cancel buttons.
- [x] **PROD-CATEDIT-028**: While a rename input is blank after trimming, the category editor shall disable its Save button.
- [x] **PROD-CATEDIT-029**: While a rename input's trimmed text equals the current name exactly, the category editor shall disable its Save button.
- [x] **PROD-CATEDIT-030**: While a category rename input matches a configured category other than the one being renamed, ignoring capitalization and surrounding whitespace, the category editor shall disable its Save button.
- [x] **PROD-CATEDIT-031**: While a group rename input matches a group other than the one being renamed, ignoring capitalization and surrounding whitespace, the category editor shall disable its Save button.
- [x] **PROD-CATEDIT-032**: When the user presses Enter in a rename input while its Save button is enabled, the category editor shall save the rename.
- [x] **PROD-CATEDIT-033**: When the user activates Cancel or presses Esc in a rename input, the category editor shall close the input without sending any request.
- [x] **PROD-CATEDIT-034**: When the user activates Rename while another rename input is open, the category editor shall close the other input without sending any request.
- [x] **PROD-CATEDIT-035**: While a request from the category editor is in flight, the category editor shall disable every Rename, Move up, Move down, "Move to", Delete, Add, Add group, and rename Save control.
- [x] **PROD-CATEDIT-036**: When a request from the category editor finishes, whether it succeeded or failed, the page shall revalidate its loaders.
- [x] **PROD-CATEDIT-037**: When an Add or Add group request from the category editor succeeds, the category editor shall clear the input it used.
- [x] **PROD-CATEDIT-038**: When a rename request from the category editor succeeds, the category editor shall close the rename input.
- [x] **PROD-CATEDIT-039**: If a request from the category editor fails, then the category editor shall keep the text in the add input that was used, or in the rename input if it is still open.
- [x] **PROD-CATEDIT-040**: If a request from the category editor responds with an error status and a JSON body with a non-empty string `error`, then the page shall show an error notification containing that message.
- [x] **PROD-CATEDIT-041**: If a request from the category editor responds with an error status and no JSON body with a non-empty string `error`, then the page shall show an error notification stating that the change was not saved.
- [x] **PROD-CATEDIT-042**: If a request from the category editor gets no response, then the page shall show an error notification stating that the change was not saved.
- [x] **PROD-CATEDIT-043**: While no groups are configured, the category editor shall show only the new group name input and the Add group button.
- [x] **PROD-CATEDIT-044**: When the user presses Enter in a group's new category name input while that section's Add button is enabled, the category editor shall add the category as Add does.
- [x] **PROD-CATEDIT-045**: When the user presses Enter in the new group name input while Add group is enabled, the category editor shall add the group as Add group does.
- [x] **PROD-CATEDIT-046**: While a rename request from the category editor is in flight, the category editor shall keep that rename input's text field and Cancel button enabled.

## Renaming a Category

- [x] **PROD-CATAPI-001**: When `/api/categories` receives a POST whose body passes validation, the system shall replace `from` with `to` in `configs.json → categories`, at the same position in the same group.
- [x] **PROD-CATAPI-002**: When `/api/categories` receives a POST whose body passes validation, the system shall set the `category` of every product record whose category is `from` to `to`.
- [x] **PROD-CATAPI-003**: When `/api/categories` renames a category, the system shall leave every other field of every product record, and every product record using another category, unchanged.
- [x] **PROD-CATAPI-004**: When `/api/categories` renames a category, the system shall leave `configs.json → routines` unchanged.
- [x] **PROD-CATAPI-005**: When `/api/categories` completes a rename, the system shall respond with status 200 and the JSON body `null`.
- [x] **PROD-CATAPI-006**: When `/api/categories` renames a category to a name that does not match `from` ignoring capitalization, the system shall first write `configs.json` with `to` inserted directly after `from` and `from` still present.
- [x] **PROD-CATAPI-007**: When `/api/categories` renames a category to a name that does not match `from` ignoring capitalization, the system shall write `usage.json` only after the write that configures both names has succeeded.
- [x] **PROD-CATAPI-008**: When `/api/categories` renames a category to a name that does not match `from` ignoring capitalization, the system shall write `configs.json` without `from` only after the write to `usage.json` has succeeded, or after the first write when no product uses `from`.
- [x] **PROD-CATAPI-009**: When `/api/categories` renames a category that no product record uses, the system shall not write `usage.json`.
- [x] **PROD-CATAPI-010**: When `/api/categories` renames a category to a name that differs from `from` only in capitalization, the system shall write `configs.json` with `from` replaced by `to` before writing `usage.json`.
- [x] **PROD-CATAPI-011**: When `/api/categories` receives a POST whose body passes validation and whose `to` equals `from`, the system shall write neither `configs.json` nor `usage.json`.
- [x] **PROD-CATAPI-012**: When `/api/categories` receives a POST, the system shall read, validate, and write `configs.json` and `usage.json` within one multi-file update holding both files.
- [x] **PROD-CATAPI-013**: If a body to `/api/categories` is not valid JSON or is not a JSON object, then the system shall treat the body as failing validation.
- [x] **PROD-CATAPI-014**: If a body to `/api/categories` lacks `from` or `to`, or contains any other top-level key, then the system shall treat the body as failing validation.
- [x] **PROD-CATAPI-015**: If `from` in a body to `/api/categories` is not a category listed in `configs.json → categories`, then the system shall treat the body as failing validation.
- [x] **PROD-CATAPI-016**: If `to` in a body to `/api/categories` is not a string containing a non-whitespace character with no leading or trailing whitespace, then the system shall treat the body as failing validation.
- [x] **PROD-CATAPI-017**: If `to` in a body to `/api/categories` matches a configured category other than `from`, ignoring capitalization, then the system shall treat the body as failing validation.
- [x] **PROD-CATAPI-018**: If a body to `/api/categories` fails validation, then the system shall respond with 400 and a JSON body of the form `{ "error": "<message>" }` describing the first failure found.
- [x] **PROD-CATAPI-019**: If a body to `/api/categories` fails validation, then the system shall leave `configs.json` and `usage.json` unchanged.
- [x] **PROD-CATAPI-020**: If a POST to `/api/categories` cannot complete because `configs.json` or `usage.json` cannot be read or written, then the system shall respond with 500 and a JSON body of the form `{ "error": "<message>" }`.
- [x] **PROD-CATAPI-021**: If a write made by `/api/categories` fails, then the system shall make none of the rename's later writes.
- [x] **PROD-CATAPI-022**: If `/api/categories` receives a GET, PUT, PATCH, or DELETE request, then the system shall respond with 405 and a JSON body of the form `{ "error": "<message>" }`.
- [x] **PROD-CATAPI-023**: If `/api/categories` receives a GET, PUT, PATCH, or DELETE request, then the system shall leave `configs.json` and `usage.json` unchanged.
