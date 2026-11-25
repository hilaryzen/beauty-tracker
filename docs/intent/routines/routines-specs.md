# Routines Specs

EARS requirements for the routines segment. Design: [routines-design.md](routines-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet implemented, or implemented but not yet covered by tests, `[D]` deferred.

## Routine Definition

- [x] **ROUT-001**: The system shall read routines from the `routines` key of `configs.json`, where each routine is a name mapped to an ordered list of product ids, each id referring to a product record's `id` field.

## Routine Cards

- [x] **ROUT-UI-001**: The home page shall display one routine card per configured routine, in configuration order, except that routines whose names are integer-like (such as `"2"`) display before all others.
- [x] **ROUT-UI-002**: Each routine card shall show the routine's name as its title.
- [x] **ROUT-UI-003**: Each routine card shall list the names of the routine's products, found by product `id`, in the routine's configured order.
- [x] **ROUT-UI-004**: Each routine card shall show a + and a − control.
- [x] **ROUT-UI-005**: If a routine lists a product id that matches no product record, then its routine card shall show "Unknown product (id N)", with N the id, in that product's place.
- [x] **ROUT-UI-006**: While no routines are configured (the `routines` value is an empty object, or `configs.json` has no `routines` key), the home page shall show no routine cards.
- [x] **ROUT-UI-007**: While a product listed on a routine card has a `shade`, the routine card shall show ` – ` (space, en dash, space) and the shade immediately after that product's name, all in the same text style as the name.

## Routine Editor

### Layout

- [x] **ROUT-EDIT-001**: The routine editor shall show one section per configured routine, in the order of ROUT-UI-001, headed by the routine's name.
- [x] **ROUT-EDIT-002**: The routine editor shall list each routine's products within its section in the routine's configured order, numbered from 1.
- [x] **ROUT-EDIT-003**: The routine editor shall show each listed product as its name, followed by ` – ` (space, en dash, space) and its shade when it has one.
- [x] **ROUT-EDIT-004**: If a routine lists a product id that matches no product record, then the routine editor shall show "Unknown product (id N)", with N the id, in that product's place.
- [x] **ROUT-EDIT-005**: The routine editor shall show Rename, Move up, Move down, and Delete controls for each routine.
- [x] **ROUT-EDIT-006**: The routine editor shall show Move up, Move down, and Remove controls for each product listed in a routine, including an unknown product.
- [x] **ROUT-EDIT-007**: The routine editor shall end each routine's section with an "Add product" dropdown.
- [x] **ROUT-EDIT-008**: The routine editor shall end with a new routine name input, a "First product" dropdown, and an Add routine button, after every routine's section.
- [x] **ROUT-EDIT-009**: While no routines are configured, the routine editor shall show only the new routine name input, the "First product" dropdown, and the Add routine button.

### Product Dropdowns

- [x] **ROUT-EDIT-010**: Each product dropdown in the routine editor shall list its products under one option group per category, labeled with the category name.
- [x] **ROUT-EDIT-011**: Each product dropdown in the routine editor shall order the option groups of configured categories by the configured order of category groups, then by each category's configured order within its group.
- [x] **ROUT-EDIT-012**: Each product dropdown in the routine editor shall leave out the option group of any category with no products to list in that dropdown.
- [x] **ROUT-EDIT-013**: Each product dropdown in the routine editor shall order the products within any option group by their order in `usage.json`.
- [x] **ROUT-EDIT-014**: Each product dropdown option in the routine editor shall show the product's name, followed by ` – ` (space, en dash, space) and its shade when it has one.
- [x] **ROUT-EDIT-015**: While two or more options in one product dropdown of the routine editor would show the same text, the routine editor shall append ` (bought <date>)` to each of those options whose product has a purchase, with the purchase date shown as the month abbreviation, day, and year, such as `Nov 7, 2026`.
- [x] **ROUT-EDIT-053**: Where a product record's category is not a configured category, each product dropdown in the routine editor that lists the product shall list it under an option group named for its category, placed after the option groups of configured categories.
- [x] **ROUT-EDIT-054**: Each product dropdown in the routine editor shall order the option groups of categories that are not configured by the order in which those categories first appear in `usage.json`.
- [x] **ROUT-EDIT-016**: A routine's "Add product" dropdown shall leave out the products already listed in that routine.
- [x] **ROUT-EDIT-017**: While every product record is listed in a routine, the routine editor shall disable that routine's "Add product" dropdown.
- [x] **ROUT-EDIT-018**: The routine editor's "First product" dropdown shall list every product record.

### Edits

- [x] **ROUT-EDIT-019**: When the user activates Add routine, the routine editor shall send a POST to `/api/configs` with a `routines` value equal to the configured routines plus a routine with the trimmed new routine name, listing only the chosen first product's id, after the existing routines.
- [x] **ROUT-EDIT-020**: When the user presses Enter in the new routine name input while Add routine is enabled, the routine editor shall add the routine as Add routine does.
- [x] **ROUT-EDIT-021**: When the user saves a routine rename, the routine editor shall send a POST to `/api/configs` with a `routines` value in which that routine's name is replaced by the trimmed new name, keeping the routine's position and products.
- [x] **ROUT-EDIT-022**: When the user activates Move up or Move down on a routine, the routine editor shall send a POST to `/api/configs` with a `routines` value in which that routine has swapped places with the routine before or after it.
- [x] **ROUT-EDIT-023**: When the user activates Delete on a routine, the routine editor shall send a POST to `/api/configs` with a `routines` value equal to the configured routines without that routine.
- [x] **ROUT-EDIT-024**: When the user chooses a product in a routine's "Add product" dropdown, the routine editor shall send a POST to `/api/configs` with a `routines` value in which that product's id is appended to the end of that routine.
- [x] **ROUT-EDIT-025**: When the user chooses a product in a routine's "Add product" dropdown, the routine editor shall return that dropdown to its "Add product…" prompt.
- [x] **ROUT-EDIT-026**: When the user activates Move up or Move down on a product in a routine, the routine editor shall send a POST to `/api/configs` with a `routines` value in which that product has swapped places with the product before or after it in the same routine.
- [x] **ROUT-EDIT-027**: When the user activates Remove on a product entry in a routine that lists more than one entry, the routine editor shall send a POST to `/api/configs` with a `routines` value in which only that entry is removed from that routine.
- [x] **ROUT-EDIT-028**: When the user activates Remove on the only entry of a routine, the routine editor shall send a POST to `/api/configs` with a `routines` value equal to the configured routines without that routine.
- [x] **ROUT-EDIT-029**: When the routine editor sends a POST to `/api/configs`, the routine editor shall send a body whose only key is `routines`.

### Disabled Controls

- [x] **ROUT-EDIT-030**: The routine editor shall disable Move up on the first routine and on the first product of each routine.
- [x] **ROUT-EDIT-031**: The routine editor shall disable Move down on the last routine and on the last product of each routine.
- [x] **ROUT-EDIT-032**: While the new routine name input is blank after trimming, the routine editor shall disable Add routine.
- [x] **ROUT-EDIT-033**: While the new routine name input matches a configured routine name ignoring capitalization and surrounding whitespace, the routine editor shall disable Add routine.
- [x] **ROUT-EDIT-034**: While no product is chosen in the "First product" dropdown, the routine editor shall disable Add routine.

### Renaming

- [x] **ROUT-EDIT-035**: When the user activates Rename on a routine, the routine editor shall replace the routine's name with a text input holding the current name, followed by Save and Cancel buttons.
- [x] **ROUT-EDIT-036**: While a routine rename input is blank after trimming, the routine editor shall disable its Save button.
- [x] **ROUT-EDIT-037**: While a routine rename input's trimmed text equals the current name exactly, the routine editor shall disable its Save button.
- [x] **ROUT-EDIT-038**: While a routine rename input matches the name of a routine other than the one being renamed, ignoring capitalization and surrounding whitespace, the routine editor shall disable its Save button.
- [x] **ROUT-EDIT-039**: When the user presses Enter in a routine rename input while its Save button is enabled, the routine editor shall save the rename.
- [x] **ROUT-EDIT-040**: When the user activates Cancel or presses Esc in a routine rename input, the routine editor shall close the input without sending any request.
- [x] **ROUT-EDIT-041**: When the user activates Rename on a routine while another routine's rename input is open, the routine editor shall close the other input without sending any request.
- [x] **ROUT-EDIT-042**: While a rename request from the routine editor is in flight, the routine editor shall keep that rename input's text field and Cancel button enabled.

### Saving

- [x] **ROUT-EDIT-043**: While a request from the routine editor is in flight, the routine editor shall disable every Rename, Move up, Move down, Delete, Remove, Add routine, and rename Save control, and every "Add product" dropdown.
- [x] **ROUT-EDIT-044**: When a request from the routine editor finishes, whether it succeeded or failed, the page shall revalidate its loaders.
- [x] **ROUT-EDIT-045**: When an Add routine request from the routine editor succeeds, the routine editor shall clear the new routine name input.
- [x] **ROUT-EDIT-046**: When an Add routine request from the routine editor succeeds, the routine editor shall return the "First product" dropdown to no product chosen.
- [x] **ROUT-EDIT-047**: When a rename request from the routine editor succeeds, the routine editor shall close the rename input.
- [x] **ROUT-EDIT-048**: If an Add routine request from the routine editor fails, then the routine editor shall keep the new routine name input's text and the "First product" dropdown's choice.
- [x] **ROUT-EDIT-049**: If a rename request from the routine editor fails while its rename input is still open, then the routine editor shall keep the text in that input.
- [x] **ROUT-EDIT-050**: If a request from the routine editor responds with an error status and a JSON body with a non-empty string `error`, then the page shall show an error notification containing that message.
- [x] **ROUT-EDIT-051**: If a request from the routine editor responds with an error status and no JSON body with a non-empty string `error`, then the page shall show an error notification stating that the change was not saved.
- [x] **ROUT-EDIT-052**: If a request from the routine editor gets no response, then the page shall show an error notification stating that the change was not saved.

## Logging

- [x] **ROUT-LOG-001**: When the user activates a routine card's + control, the system shall log a +1 current-month use for every product in that routine as one logging set (usage segment, USAGE-LOG-003 and USAGE-LOG-004).
- [x] **ROUT-LOG-002**: When the user activates a routine card's − control, the system shall log a −1 current-month use for every product in that routine as one logging set (usage segment, USAGE-LOG-003 and USAGE-LOG-004).

## Validation

- [x] **ROUT-VAL-001**: When a `routines` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation unless it is an object whose values are arrays of integers.
- [x] **ROUT-VAL-002**: When a `routines` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any routine name is empty or contains only whitespace.
- [x] **ROUT-VAL-006**: When a `routines` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any routine name starts or ends with whitespace.
- [x] **ROUT-VAL-003**: When a `routines` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any routine lists no products.
- [x] **ROUT-VAL-004**: When a `routines` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any routine lists the same product id more than once.
- [x] **ROUT-VAL-005**: When a `routines` value is validated for a POST to `/api/configs`, the system shall treat it as failing validation if any listed product id matches no product record in `usage.json`.
