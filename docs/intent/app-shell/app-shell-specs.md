# App Shell Specs

EARS requirements for the app-shell segment. Design: [app-shell-design.md](app-shell-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet implemented, or implemented but not yet covered by tests, `[D]` deferred.

## Layout

- [x] **SHELL-UI-001**: Every page, including the error page, shall use Inter as its default font.
- [x] **SHELL-UI-002**: Every page, including the error page, shall display in light or dark color mode according to the user's system color-scheme preference.
- [x] **SHELL-UI-003**: Every page shall provide a notification area at the bottom-right of the viewport where features can show notifications.
- [x] **SHELL-UI-004**: Every page, including the error page, shall have the document title "Beauty Tracker".
- [x] **SHELL-UI-005**: Every page, including the error page, shall have the meta description "Track beauty product usage, purchases, and inventory".

## Navigation Header

- [x] **SHELL-NAV-001**: Every page, including the error page, shall display a header above the page content.
- [x] **SHELL-NAV-002**: The header shall show the app name "Beauty Tracker" as text that is not a link.
- [x] **SHELL-NAV-003**: The header shall show a "Usage" link to `/` followed by a "Purchases" link to `/purchases`.
- [x] **SHELL-NAV-004**: While the current path is `/` — showing the home page, or the error page when the home page fails to load — the header shall mark the "Usage" link, and no other link, with `aria-current="page"`.
- [x] **SHELL-NAV-005**: While the current path is `/purchases`, the header shall mark the "Purchases" link, and no other link, with `aria-current="page"`.
- [x] **SHELL-NAV-006**: While the current path matches no route, the header shall mark no link with `aria-current="page"`.
- [x] **SHELL-NAV-007**: The header shall display the link marked with `aria-current="page"` in a visual style that differs from the other header links.
- [x] **SHELL-NAV-008**: When the user selects a header link, the system shall show the linked page without a full document reload.

## Home Page

- [x] **SHELL-HOME-001**: The home page shall display the routine cards above the usage table.
- [x] **SHELL-HOME-002**: If `configs.json` or `usage.json` cannot be read when the home page loads, then the system shall respond with status 500 and the status text "Your data could not be loaded."

## Purchases Page

- [x] **SHELL-PURCH-001**: The purchases page (`/purchases`) shall show the top-level heading "Purchases".
- [ ] **SHELL-PURCH-003**: The purchases page (`/purchases`) shall show the purchase list below its heading.
- [ ] **SHELL-PURCH-004**: If `configs.json` or `usage.json` cannot be read when the purchases page loads, then the system shall respond with status 500 and the status text "Your data could not be loaded."

## Error Page

- [x] **SHELL-ERR-001**: If a route responds with status 404, then the error page shall show the heading "404" and the message "The requested page could not be found."
- [x] **SHELL-ERR-002**: If a route responds with an error status other than 404, then the error page shall show the heading "Error" and the response's status text, or "An unexpected error occurred." when the response has no status text.
- [x] **SHELL-ERR-003**: If an `Error` is thrown while the app runs in development mode, then the error page shall show the heading "Oops!", the error's message, and its stack trace.
- [x] **SHELL-ERR-004**: If a thrown error is not a route error response and not an `Error` thrown in development mode, then the error page shall show the heading "Oops!" and the message "An unexpected error occurred."
