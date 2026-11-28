# Inventory Specs

EARS requirements for the inventory segment. Design: [inventory-design.md](inventory-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet implemented, or implemented but not yet covered by tests, `[D]` deferred.

## Inventory Table

- [x] **INV-UI-001**: The home page shall display a inventory table whose product rows show category, product name, brand, overall uses, and this month's uses.
- [x] **INV-UI-002**: Among products that share a status position, the inventory table shall order rows by the position of each product's category in the concatenation of all configured category groups, taken in the groups' configured order.
- [x] **INV-UI-003**: When two products in the inventory table share a status position and a category position, the inventory table shall keep them in their stored order.
- [x] **INV-UI-004**: The inventory table shall show, as a product's overall uses, the sum of the product's closed-month use counts plus its current-month use count.
- [x] **INV-UI-005**: The inventory table shall show a + and a − control on every product row.
- [x] **INV-UI-006**: If `configs.json` has no `categories` key, then the inventory table shall show product rows that share a status position in their stored order.
- [x] **INV-UI-007**: The inventory table shall show an Add product button above the product rows.
- [x] **INV-UI-008**: The inventory table shall show an edit button on every product row.
- [x] **INV-UI-009**: When the user activates the Add product button, the inventory table shall open the product dialog to add a product.
- [x] **INV-UI-010**: When the user activates a product row's edit button, the inventory table shall open the product dialog to edit that product.
- [x] **INV-UI-011**: While a product record has a `shade`, the inventory table shall show in that row's Product column the product name, followed by ` – ` (space, en dash, space) and the shade, all in the same text style as the name.
- [x] **INV-UI-012**: While a product record has no `shade`, the inventory table shall show only the product name in that row's Product column.

## Group Tabs

- [x] **INV-UI-013**: The inventory table shall show a row of tabs: an "All" tab first, followed by one tab per category group in `configs.json → categories`, in the groups' configured order, each labeled with its group name.
- [x] **INV-UI-014**: While the inventory table's "All" tab is selected, the inventory table shall show one row per product record.
- [x] **INV-UI-015**: While a group tab is selected in the inventory table, the inventory table shall show one row per product record whose category is in that group, and no other product rows.
- [x] **INV-UI-016**: While a group tab is selected in the inventory table and no product record's category is in that group, the inventory table shall show the message "No products in this group." in place of product rows.
- [x] **INV-UI-017**: If `configs.json` has no `categories` key, then the inventory table shall show only the "All" tab.
- [x] **INV-UI-018**: While the home page URL's `group` search parameter equals the name of a configured category group, the inventory table shall select that group's tab.
- [x] **INV-UI-019**: While the home page URL has no `group` search parameter, the inventory table shall select the "All" tab.
- [x] **INV-UI-020**: If the home page URL's `group` search parameter matches no configured category group name, then the inventory table shall select the "All" tab.
- [x] **INV-UI-021**: When the user selects a group tab other than the selected tab in the inventory table, the system shall set the home page URL's `group` search parameter to that group's name.
- [x] **INV-UI-022**: When the user selects the "All" tab in the inventory table while another tab is selected, the system shall remove the `group` search parameter from the home page URL.
- [x] **INV-UI-023**: When the user selects an inventory table tab other than the selected tab, the system shall add a browser history entry for the new URL.
- [x] **INV-UI-024**: When the user selects the inventory table tab that is already selected, the system shall leave the home page URL unchanged.
- [x] **INV-UI-025**: When the user moves keyboard focus between inventory table tabs with the arrow keys, the inventory table shall leave the selected tab unchanged.

## Dates

- [x] **INV-UI-026**: The inventory table shall show Purchased, Opened, Expires, and Removed columns, in that order, after the This Month's Uses column and before the + and − controls.
- [x] **INV-UI-027**: While a product record has a `purchase`, the inventory table shall show the purchase's `date`, as stored in `YYYY-MM-DD` form, in that row's Purchased column.
- [x] **INV-UI-028**: While a product record has an `opened`, `expires`, or `removed` date, the inventory table shall show that date, as stored in `YYYY-MM-DD` form, in that row's Opened, Expires, or Removed column respectively.
- [x] **INV-UI-029**: While a product record has no `purchase`, the inventory table shall leave that row's Purchased cell empty.
- [x] **INV-UI-030**: While a product record has no `opened`, `expires`, or `removed` date, the inventory table shall leave that row's Opened, Expires, or Removed cell respectively empty.

## Size, Cost, and Rating

- [x] **INV-UI-031**: The inventory table shall show Size, Cost, and Rating columns, in that order, after the Brand column and before the Overall Uses column.
- [x] **INV-UI-032**: While a product record has a `size` that satisfies the products record rules, the inventory table shall show in that row's Size column the size's `amount` written in its shortest decimal form, without trailing zeros, followed by a space and its `unit` (`1.7 fl oz`).
- [x] **INV-UI-033**: While a product record has no `size`, or a `size` that does not satisfy the products record rules, the inventory table shall leave that row's Size cell empty.
- [x] **INV-UI-034**: While a product record has a `purchase`, the inventory table shall show in that row's Cost column the purchase's `price` in the same format as the purchase list shows amounts (PURCH-LIST-009), such as `$32.00`.
- [x] **INV-UI-035**: While a product record has no `purchase`, the inventory table shall leave that row's Cost cell empty.
- [x] **INV-UI-036**: While a product record has a `rating` that is an integer from 1 to 5, the inventory table shall show that rating as a number in that row's Rating column.
- [x] **INV-UI-037**: While a product record has no `rating`, or a `rating` that is not an integer from 1 to 5, the inventory table shall leave that row's Rating cell empty.

## Status

- [x] **INV-UI-038**: The inventory table shall order rows by status position, in the status order `In Progress`, `Opened`, `Backlog`, `Panned`, `Decluttered` (PROD-010).
- [x] **INV-UI-039**: The inventory table shall give every product record that has no `status`, or a `status` other than `Backlog`, `Opened`, `In Progress`, `Panned`, or `Decluttered`, one shared status position after `Decluttered`.
- [x] **INV-UI-040**: The inventory table shall show a Status column as its first column, before the Category column.
- [x] **INV-UI-041**: While a product record has a `status` of `Backlog`, `Opened`, `In Progress`, `Panned`, or `Decluttered`, the inventory table shall show that status, as stored, in that row's Status column.
- [x] **INV-UI-042**: While a product record has no `status`, or a `status` other than `Backlog`, `Opened`, `In Progress`, `Panned`, or `Decluttered`, the inventory table shall leave that row's Status cell empty.

## Logging Controls

- [x] **INV-LOG-001**: When the user activates a product row's + control in the inventory table, the system shall increase that product's current-month use count by 1.
- [x] **INV-LOG-002**: When the user activates a product row's − control in the inventory table, the system shall decrease that product's current-month use count by 1, subject to USAGE-LOG-006.
