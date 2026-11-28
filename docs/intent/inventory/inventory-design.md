---
parent: high-level-design
prefix: INV
---

# Inventory

## Context and Design Philosophy

The inventory segment answers "what do I already have in this category, and how much do I use it?" (HLD Goal 3) from one screen: the inventory table on the home page. It lists every product record with its details, purchase, and use counts, grouped by category, with the products in use first.

The inventory owns how products are shown and ordered, not the data behind them. The products segment owns the record, its rules, and the product dialog (products design, *Product Record*). The purchases segment owns the `purchase` field (purchases design, *Purchase Field*). The usage segment owns the use counts and every change to them (usage design, *Logging a Use*). The inventory table reads all of these, and its +/- controls are the per-product way to log a use (HLD Goal 1).

The table lists every product record, including products that are used up or gotten rid of (`Panned`, `Decluttered`; products design, *Product Status*). Status order sorts the products in use first and those no longer owned last, so the top of the table is what is owned now, and a product's history stays visible below.

## Inventory Table

`InventoryTable` (`src/features/inventory/inventory-table.tsx`) renders an Add product button, a row of group tabs, and one row per product shown on the selected tab, with columns: Status, Category, Product, Brand, Size, Cost, Rating, Overall Uses, This Month's Uses, Purchased, Opened, Expires, Removed, +/- controls, and an edit button.

- **Status** — the product's `status` as stored (`In Progress`). Empty when the product has no `status`, or one that is not one of the five.
- **Product** — the product's name with its shade (products design, *Product Name with Shade*).
- **Size** — the product's `size` (products design, *Product Record*) as its amount written without trailing zeros, a space, and its unit (`1.7 fl oz`, `50 mL`). Empty when the product has no size, or a size that breaks the products record rules (possible only by a hand edit), matching how the product dialog treats one.
- **Cost** — the product's purchase price (`purchase.price`, purchases design, *Purchase Field*) as US dollars with two decimal places (`$32.00`), the format the purchases page uses (`formatDollars`). `$0.00` for a gift or free sample. Empty when the product has no purchase. The table only shows the price; it is changed on the purchases page.
- **Rating** — the product's `rating` as a bare number (`4`). Empty when the product has no rating, or a rating that is not an integer from 1 to 5.
- **Overall Uses** — sum of all values in `uses`, plus `usesThisMonth`.
- **This Month's Uses** — `usesThisMonth`.
- **Purchased, Opened, Expires, Removed** — the product's purchase date (`purchase.date`, purchases design, *Purchase Field*) and its `opened`, `expires`, and `removed` dates (products design, *Product Record*), each shown as stored, in `YYYY-MM-DD` form. A cell is empty when the product has no such date. The table only shows these dates; they are changed in the product dialog and, for the purchase date, on the purchases page.
- **+/- controls** — the shared `AddMinusButtons` (app-shell design, *Shared Controls*). + calls `useUsage().addUsesToItems([id])` and − calls `removeUsesFromItems([id])` with the row's product id. What a click changes, how it is saved, and how a failed save is reported belong to the usage segment (usage design, *Logging a Use*).
- **Add product and edit buttons** — open the products segment's `ProductDialog`, to add a product or to edit that row's product.

## Sort Order

Rows are ordered first by `status`, in status order (`In Progress`, `Opened`, `Backlog`, `Panned`, `Decluttered`; products design, *Product Status*). A product whose `status` is missing or not one of the five (possible only by a hand edit) sorts after `Decluttered`. Rows with the same status are ordered by the position of their `category` in the concatenation of all category groups, taken in the groups' configured order. Rows with equal status and category position keep file order (stable sort). If `configs.json` has no `categories` key, there are no groups: every row has the same category position, so rows are ordered by status and then file order. Sorting applies on every tab.

## Group Tabs

- **Tabs** — an "All" tab comes first, followed by one tab per category group in `configs.json → categories`, in configured order and labeled with the group name. The "All" tab shows every product. A group's tab shows only the products whose `category` is in that group. A group whose tab has no products shows the message "No products in this group." in place of rows. If `configs.json` has no `categories` key, only the "All" tab is shown.
- **Selected tab in the URL** — the selected group is kept in the page URL's `group` search parameter (for example `/?group=lips`), and the "All" tab is selected when the parameter is absent. Choosing a different group tab sets the parameter to the group name, and choosing "All" from another tab removes it. Each such choice adds a browser history entry, so Back returns to the previous tab. Choosing the tab that is already selected does nothing, so an unrecognized parameter stays in the URL until another tab is chosen. With the keyboard, the arrow keys move focus between tabs without selecting them, and Enter or Space selects the focused tab, so passing over tabs adds no history entries. The header's Inventory link points to `/`, so following it shows the "All" tab. Because the selection lives in the URL, it survives the page's loader revalidation after logging a use or saving a product, a page refresh, and returning to the page through a bookmarked link. If the parameter names no configured group (for example, after a group is renamed in `configs.json`), the "All" tab is selected and every product is shown.
- **Scope of the tabs** — the tabs filter only the inventory table; the routine cards above it show every routine on every tab.
- **Adding and editing on a group tab** — the Add product button and edit buttons behave the same on every tab: the product dialog opens as it does from "All", with no category chosen when adding. A product saved into a category outside the selected group is saved but no longer shown on that tab; the tab stays selected.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Products no longer owned | Every product record is listed and can be logged, with `Panned` and `Decluttered` products sorted last by status | Hide finished products; dim them; a separate history view | Status order already puts what is owned now at the top, so hiding adds no clarity. Keeping finished products visible shows how much past products were used, which helps judge a repurchase, and a mistaken status can be fixed from the row's edit button |
| Logging from the table | The table's +/- controls call `useUsage`, the usage segment's hook | The table posts to `/api/usage` itself | One logging path for the table and routine cards keeps count changes and their error handling in the usage segment |
| Overall Uses | Past months plus current month | Closed months only | Matches the real total used so far, which is what cost per use divides by |
| Table filter | Tabs: "All", then one per category group | One tab per category; a category dropdown filter; no filter | Groups match how products are browsed (skincare, makeup, lips) and stay few enough for one row of tabs. A tab per category would make about 20 tabs. The Category column still tells categories apart within a group |
| Where the selected tab lives | The page URL's `group` search parameter | Component state | It survives loader revalidation, refresh, and bookmarks, and Back works. The cost is that choosing a tab reruns the home page loader: cheap for local JSON files, and if a data file cannot be read at that moment, the tab click shows the error page as any other reload would (*Simplicity over robustness*) |
| Keyboard tab selection | Arrow keys move focus; Enter or Space selects | Arrow keys select the tab they reach | Each selection adds a history entry and reruns the loader, so selecting on arrow keys would leave one Back step for every tab passed over |
| Groups with no products | Shown as a tab with an empty-group message | Hidden | The tab row follows `configs.json` exactly, so a new group appears as soon as it is created |
| Product dates in the table | Purchased, Opened, Expires, and Removed columns after the use counts, in `YYYY-MM-DD` form, empty when absent | Before the use counts; `Nov 7, 2026` as on the purchases page | The use counts, which change daily, come before the dates, which rarely change. `YYYY-MM-DD` is compact across four columns and lines up row to row |
| Size, cost, and rating in the table | Size, Cost, and Rating columns after Brand; notes are not shown | After the dates; a Notes column | Size, cost, and rating describe the product, so they sit with its name and brand, and cost beside size lets two products be compared at a glance. Notes run to several lines and would make rows uneven; they are read in the product dialog |
| Cost column | The purchase price, in the purchases page's dollar format | Cost per use; a cost field on the product | The price is the one recorded cost (HLD *Purchase model*); showing it in the same format means it reads the same on both pages |
| Rating display | The bare number (`4`) | Stars (`★★★★☆`); `4/5` | The column header already says what the number means, and a digit is the narrowest cell |
| Status column and sort | Status is the leftmost column, and rows sort by status before category | Status as a filter or tabs; sort by category only | The products in use come first and the ones no longer owned sink to the bottom, so the table reads as what to reach for now; status first matches the column that drives the sort. Group tabs already filter, and a second row of tabs would crowd them |
| Rows with an unrecognized status | Shown with an empty Status cell, sorted after `Decluttered` | Treat the file as unreadable; hide the row | Only a hand edit can store one; the row stays visible and loggable, and editing it fixes it |

## References

- src/features/inventory/inventory-table.tsx
- src/features/usage/use-usage.ts
- src/features/purchases/money.ts
- docs/intent/usage/usage-design.md
- docs/intent/products/products-design.md
- docs/intent/purchases/purchases-design.md
- docs/intent/app-shell/app-shell-design.md
- docs/arrows/inventory.md
