# App Shell Specs

EARS requirements for the app-shell segment. Design: [app-shell-design.md](app-shell-design.md).

Status markers: `[x]` implemented with tests, `[ ]` not yet covered by tests (all current specs describe behavior observed in code but untested), `[D]` deferred.

## Layout

- [ ] **SHELL-UI-001**: Every page shall use Inter as its default sans-serif font.
- [ ] **SHELL-UI-002**: Every page shall display in light or dark color mode according to the user's system color-scheme preference.

## Home Page

- [ ] **SHELL-HOME-001**: The home page shall display the routine cards above the usage table.
- [ ] **SHELL-HOME-002**: If `configs.json` or `usage.json` cannot be read when the home page loads, then the system shall respond with 404 Not Found.

## Error Page

- [ ] **SHELL-ERR-001**: If a route responds with status 404, then the error page shall show the heading "404" and the message "The requested page could not be found."
- [ ] **SHELL-ERR-002**: If a route responds with an error status other than 404, then the error page shall show the heading "Error" and the response's status text, or "An unexpected error occurred." when the response has no status text.
- [ ] **SHELL-ERR-003**: If an `Error` is thrown while the app runs in development mode, then the error page shall show the heading "Oops!", the error's message, and its stack trace.
- [ ] **SHELL-ERR-004**: If a thrown error is not a route error response and not an `Error` thrown in development mode, then the error page shall show the heading "Oops!" and the message "An unexpected error occurred."
