# App Shell Specs

EARS requirements for the app-shell segment. Design: [app-shell-design.md](app-shell-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet implemented, or implemented but not yet covered by tests, `[D]` deferred.

## Layout

- [x] **SHELL-UI-001**: Every page, including the error page, shall use Inter as its default font.
- [x] **SHELL-UI-002**: Every page, including the error page, shall display in light or dark color mode according to the user's system color-scheme preference.
- [x] **SHELL-UI-003**: Every page shall provide a notification area at the bottom-right of the viewport where features can show notifications.
- [x] **SHELL-UI-004**: Every page, including the error page, shall have the document title "Beauty Tracker".

## Home Page

- [x] **SHELL-HOME-001**: The home page shall display the routine cards above the usage table.
- [x] **SHELL-HOME-002**: If `configs.json` or `usage.json` cannot be read when the home page loads, then the system shall respond with status 500 and the status text "Your data could not be loaded."
- [x] **SHELL-HOME-004**: The home page shall have the meta description "Track beauty product usage, purchases, and inventory".

## Error Page

- [x] **SHELL-ERR-001**: If a route responds with status 404, then the error page shall show the heading "404" and the message "The requested page could not be found."
- [x] **SHELL-ERR-002**: If a route responds with an error status other than 404, then the error page shall show the heading "Error" and the response's status text, or "An unexpected error occurred." when the response has no status text.
- [x] **SHELL-ERR-003**: If an `Error` is thrown while the app runs in development mode, then the error page shall show the heading "Oops!", the error's message, and its stack trace.
- [x] **SHELL-ERR-004**: If a thrown error is not a route error response and not an `Error` thrown in development mode, then the error page shall show the heading "Oops!" and the message "An unexpected error occurred."
