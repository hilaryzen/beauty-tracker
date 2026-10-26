---
parent: high-level-design
prefix: SHELL
---

# App Shell

## Context and Design Philosophy

The app shell is everything around the features: the HTML document, theme, fonts, error page, route table, and the home page that places the feature components together. It also holds small UI controls shared by more than one feature.

The shell composes features but owns none of their behavior — the home page loads data and hands it to the usage and routines components, which decide what to display and how logging works.

## Stack

- **Framework** — React Router v8 in framework mode with server-side rendering (`react-router.config.ts`, `ssr: true`), app directory `src/app`.
- **Build** — Vite with the React Router and Tailwind plugins (`vite.config.ts`).
- **Component library** — Chakra UI v3 with its default system, wrapped by `Provider` (`src/components/ui/provider.tsx`).
- **Styling** — Chakra props in feature components; Tailwind in `app.css` (page background, dark color-scheme) and the error boundary.
- **Path aliases** — `@/*` → `src/*`, `~/*` → `src/app/*` (`tsconfig.json`).

## Routes

| Path | Module | Purpose |
|---|---|---|
| `/` | `routes/home.tsx` | Home page |
| `/api/usage` | `routes/api.usage.ts` | Usage data API (usage segment) |
| `/api/configs` | `routes/api.configs.ts` | Configuration API (data-store segment) |

## Root Layout

`src/app/root.tsx` renders the HTML document for every route:

- `<html lang="en">` with `suppressHydrationWarning` (required by next-themes class switching).
- Google Fonts preconnect and stylesheet links for Inter; `app.css` sets Inter as the default sans font.
- Body content wrapped in `Provider` → `ChakraProvider` + `ColorModeProvider` (next-themes, `attribute="class"`). Color mode follows the system preference; no toggle is rendered.

## Error Page

`ErrorBoundary` in `root.tsx` renders a heading and message:

| Error | Heading | Message |
|---|---|---|
| Route response 404 | "404" | "The requested page could not be found." |
| Other route response | "Error" | The response's status text, or "An unexpected error occurred." |
| Thrown `Error` in development | "Oops!" | The error message, plus the stack trace |
| Anything else | "Oops!" | "An unexpected error occurred." |

## Home Page

`src/app/routes/home.tsx`:

- **Loader** (server) — reads `configs.json` and `usage.json` through the data store; throws a 404 response if either is unreadable. Returns `{ usage, categories, routines }`.
- **Component** — renders `RoutineCard` (routines segment) above `UsageTable` (usage segment), passing each the loader data it needs.
- **Meta** — title "New React Router App", description "Welcome to React Router!" (starter defaults).

## Shared Controls

`AddMinusButtons` (`src/components/add-minus-buttons/main.tsx`) renders a "+" button and a "−" button, calling `onAddClick` / `onMinusClick`. Used by the usage table rows and routine cards.

`src/components/ui/` holds Chakra CLI-generated snippets. `provider.tsx` and `ColorModeProvider` are in use; `toaster.tsx`, `tooltip.tsx`, and the `ColorModeButton` / `LightMode` / `DarkMode` exports are not imported anywhere.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Rendering | Server-side rendering with route loaders | SPA mode | [inferred] Loaders read data files directly on the server; no separate API call on page load |
| Component library | Chakra UI v3 | Tailwind-only; other libraries | [inferred] Ready-made table, card, and button components |
| Home page composition | One page showing routines then the usage table | Separate pages per feature | [inferred] Small app; everything the user logs is on one screen |
| Shared +/− control | One `AddMinusButtons` component | Per-feature buttons | [inferred] Identical control in both features |

## Open Questions & Future Decisions

### Deferred
1. **Page metadata** — replace the starter title and description with app-specific ones?
2. **Color mode toggle** — add a visible toggle (the `ColorModeButton` exists), or keep following the system setting?
3. **Unused UI snippets** — keep `toaster`/`tooltip` for planned features (e.g. a toast on save failure), or delete?
4. **Two styling systems** — consolidate on Chakra, or keep Tailwind for global styles?
5. **Duplicated read-or-404 logic** — the home loader's `readFromFile` mirrors the API routes' loaders; share one helper?
6. **Navigation** — no nav or header exists; needed once purchases/inventory add pages?

## References

- src/app/root.tsx, src/app/app.css, src/app/routes.ts, src/app/routes/home.tsx
- src/components/add-minus-buttons/main.tsx
- src/components/ui/
- react-router.config.ts, vite.config.ts, tsconfig.json
- docs/arrows/app-shell.md
