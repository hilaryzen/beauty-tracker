---
parent: high-level-design
prefix: SHELL
---

# App Shell

## Context and Design Philosophy

The app shell is everything around the features: the HTML document, theme, fonts, error page, route table, navigation header, notifications, and the pages that place the feature components together. It also holds small UI controls shared by more than one feature.

The app has one page per tracked area — the home page for usage and a purchases page — reached from a header on every page. The shell composes features but owns none of their behavior. The home page loads data through each owning segment and hands it to the usage and routines components, which decide what to display and how logging works.

## Stack

- **Framework** — React Router v8 in framework mode with server-side rendering (`react-router.config.ts`, `ssr: true`), app directory `src/app`.
- **Build** — Vite with the React Router plugin (`vite.config.ts`).
- **UI and styling** — Chakra UI v3, the app's only styling system. A Chakra system based on the default system sets Inter as the body and heading font; Chakra's global styles provide the page background in light and dark mode.
- **Path aliases** — `@/*` → `src/*`, `~/*` → `src/app/*` (`tsconfig.json`).

## Routes

| Path | Module | Purpose |
|---|---|---|
| `/` | `routes/home.tsx` | Home page (usage) |
| `/purchases` | `routes/purchases.tsx` | Purchases page |
| `/api/usage` | `routes/api.usage.ts` | Usage data API (usage segment) |
| `/api/products` | `routes/api.products.ts` | Product add and edit API (products segment) |
| `/api/configs` | `routes/api.configs.ts` | Configuration API (data-store segment) |

## Root Layout

`src/app/root.tsx` renders the HTML document for every route:

- `<html lang="en">` with `suppressHydrationWarning` (required by next-themes class switching).
- Google Fonts preconnect and stylesheet links for Inter.
- Body content wrapped in `Shell` — `Provider` (`ChakraProvider` with the app's Chakra system, plus `ColorModeProvider`: next-themes, `attribute="class"`), the navigation header, and `<Toaster />` — inside `Layout`. React Router renders `Layout` around both the normal route tree and `ErrorBoundary`, so the error page gets Chakra styling, color mode, and the header too. Color mode follows the system's light/dark preference; there is no in-app toggle.
- `<Toaster />` rendered once inside `Shell`, so any feature can show notifications through the shared `toaster` (`src/components/ui/toaster.tsx`). Notifications appear at the bottom-right of the page.

**Document title and description.** Every page, including the error page, has the title "Beauty Tracker" and the meta description "Track beauty product usage, purchases, and inventory". Both are set in the root layout rather than by individual routes, so they are present even when a route's loader fails.

## Navigation Header

`AppHeader` (`src/components/app-header/main.tsx`) renders above the page content on every page, including the error page. It shows the app name "Beauty Tracker" as plain text — not a link and not a heading — and one link per page, in this order:

| Link | Goes to |
|---|---|
| Usage | `/` |
| Purchases | `/purchases` |

The link for the page being shown is highlighted and marked as the current page (`aria-current="page"`). Which link is current follows the path, not what the page renders: on `/`, Usage is current even when the home page fails to load and the error page shows instead. The Usage link matches `/` exactly, so it is not highlighted on `/purchases`. On a path that matches no route, no link is highlighted. Links navigate on the client without a full page reload.

## Error Page

`ErrorBoundary` in `root.tsx` renders a heading and message, styled with Chakra:

| Error | Heading | Message |
|---|---|---|
| Route response 404 | "404" | "The requested page could not be found." |
| Other route response | "Error" | The response's status text, or "An unexpected error occurred." |
| Thrown `Error` in development | "Oops!" | The error message, plus the stack trace |
| Anything else | "Oops!" | "An unexpected error occurred." |

## Home Page

`src/app/routes/home.tsx`:

- **Loader** (server) — loads product records through the usage segment's server-side loader, which applies month rollover (usage design, *Month Rollover*), and reads `configs.json` through the data store. If either file is unreadable, it throws a response with status 500 and status text "Your data could not be loaded.", which the error page shows under the heading "Error". If the rollover write fails, the loader's error propagates to the error page. Returns `{ usage, categories, routines }`.
- **Component** — renders `RoutineCard` (routines segment) above `UsageTable` (usage segment), passing each the loader data it needs.

## Purchases Page

`src/app/routes/purchases.tsx` is a placeholder until purchases are designed (HLD: purchases have no segment yet). It shows the top-level heading "Purchases" and the text "Purchase tracking is coming soon." It has no loader, so it reads no data and cannot fail to load.

## Shared Controls

`AddMinusButtons` (`src/components/add-minus-buttons/main.tsx`) renders a "+" button and a "−" button, calling `onAddClick` / `onMinusClick`. Used by the usage table rows and routine cards.

`src/components/ui/` holds Chakra snippets the app uses: `provider.tsx`, `ColorModeProvider` in `color-mode.tsx`, and `toaster.tsx`.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Rendering | Server-side rendering with route loaders | SPA mode | Loaders read data files directly on the local server (HLD Key Design Decisions: local server-rendered app) |
| Styling system | Chakra UI only | Chakra plus Tailwind; Tailwind only | One system to learn and maintain; Chakra already supplies every component the features use |
| Color mode | Follow the system preference; no toggle | In-app toggle | Nothing to build or remember; the system setting already expresses the preference |
| Notifications | One shared Chakra toaster mounted in the root layout | Per-feature inline error messages | Any feature (first, usage save failures) can notify without its own UI |
| Unreadable data on the home page | 500 with "Your data could not be loaded." | 404 Not Found | The page exists; a 404 message would misdescribe the failure |
| Document title | "Beauty Tracker", set in the root layout for every page | Per-route titles | One app, one title; root placement keeps it on the error page |
| Meta description | One description, set in the root layout for every page | Per-route descriptions | The description names the whole app, so it fits every page; root placement keeps it on the error page |
| App name in the header | Plain text | A link to `/` | The Usage link already goes to `/`; one way there is enough |
| Page structure | One page per tracked area (usage, purchases), linked from a header | Everything on one page; usage at `/usage` with `/` redirecting | Each area's content grows independently. Usage stays at `/` because it is the page used every day |
| Routines placement | On the usage page, above the usage table | Their own page | Routines are a way of logging usage |
| Navigation | A header on every page, including the error page | Sidebar; header on normal pages only | Few pages fit in a header; on the error page it gives a way back |
| Purchases page content | Placeholder text | No page until purchases are designed | Sets up the page and its navigation now; the page gets real content when purchases are designed |
| Shared +/− control | One `AddMinusButtons` component | Per-feature buttons | [inferred] Identical control in both features |
| Unused generated snippets | Delete them | Keep for possible future use | The Chakra CLI regenerates any snippet on demand |

## Open Questions & Future Decisions

### Deferred
1. **Inventory page** — add a header link when inventory gets a page.

## References

- src/app/root.tsx, src/app/routes.ts, src/app/routes/home.tsx, src/app/routes/purchases.tsx
- src/components/app-header/main.tsx
- src/components/add-minus-buttons/main.tsx
- src/components/ui/
- react-router.config.ts, vite.config.ts, tsconfig.json
- docs/intent/usage/usage-design.md
- docs/arrows/app-shell.md
