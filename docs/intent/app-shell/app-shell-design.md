---
parent: high-level-design
prefix: SHELL
---

# App Shell

## Context and Design Philosophy

The app shell is everything around the features: the HTML document, theme, fonts, error page, route table, notifications, and the home page that places the feature components together. It also holds small UI controls shared by more than one feature.

The shell composes features but owns none of their behavior. The home page loads data through each owning segment and hands it to the usage and routines components, which decide what to display and how logging works.

## Stack

- **Framework** — React Router v8 in framework mode with server-side rendering (`react-router.config.ts`, `ssr: true`), app directory `src/app`.
- **Build** — Vite with the React Router plugin (`vite.config.ts`).
- **UI and styling** — Chakra UI v3, the app's only styling system. A Chakra system based on the default system sets Inter as the body and heading font; Chakra's global styles provide the page background in light and dark mode.
- **Path aliases** — `@/*` → `src/*`, `~/*` → `src/app/*` (`tsconfig.json`).

Currently Tailwind is also installed: `app.css` sets the Inter font and page background, and the error boundary uses Tailwind classes.

## Routes

| Path | Module | Purpose |
|---|---|---|
| `/` | `routes/home.tsx` | Home page |
| `/api/usage` | `routes/api.usage.ts` | Usage data API (usage segment) |
| `/api/configs` | `routes/api.configs.ts` | Configuration API (data-store segment) |

## Root Layout

`src/app/root.tsx` renders the HTML document for every route:

- `<html lang="en">` with `suppressHydrationWarning` (required by next-themes class switching).
- Google Fonts preconnect and stylesheet links for Inter.
- Body content wrapped in `Provider` → `ChakraProvider` + `ColorModeProvider` (next-themes, `attribute="class"`) inside `Layout`. React Router renders `Layout` around both the normal route tree and `ErrorBoundary`, so the error page gets Chakra styling and color mode too. Color mode follows the system's light/dark preference; there is no in-app toggle.
- `<Toaster />` rendered once inside `Provider`, so any feature can show notifications through the shared `toaster` (`src/components/ui/toaster.tsx`). Notifications appear at the bottom-right of the page.

Currently `Provider` wraps only `App`'s outlet, not the error page, and `<Toaster />` is not rendered.

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
- **Meta** — description "Track beauty product usage, purchases, and inventory".

**Document title.** Every page, including the error page, has the title "Beauty Tracker". The title is set in the root layout rather than by individual routes, so it is present even when a route's loader fails.

Currently the loader reads `usage.json` directly through its own read-or-404 helper, without rollover; unreadable data responds 404; and the title and description are the React Router starter's defaults, set only on the home route.

## Shared Controls

`AddMinusButtons` (`src/components/add-minus-buttons/main.tsx`) renders a "+" button and a "−" button, calling `onAddClick` / `onMinusClick`. Used by the usage table rows and routine cards.

`src/components/ui/` holds Chakra snippets the app uses: `provider.tsx`, `ColorModeProvider` in `color-mode.tsx`, and `toaster.tsx`. Currently it also holds unused snippets — `tooltip.tsx` and the `ColorModeButton`, `ColorModeIcon`, `LightMode`, `DarkMode`, `useColorMode`, and `useColorModeValue` exports — which are to be deleted.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Rendering | Server-side rendering with route loaders | SPA mode | Loaders read data files directly on the local server (HLD Key Design Decisions: local server-rendered app) |
| Styling system | Chakra UI only | Chakra plus Tailwind; Tailwind only | One system to learn and maintain; Chakra already supplies every component the features use |
| Color mode | Follow the system preference; no toggle | In-app toggle | Nothing to build or remember; the system setting already expresses the preference |
| Notifications | One shared Chakra toaster mounted in the root layout | Per-feature inline error messages | Any feature (first, usage save failures) can notify without its own UI |
| Unreadable data on the home page | 500 with "Your data could not be loaded." | 404 Not Found | The page exists; a 404 message would misdescribe the failure |
| Document title | "Beauty Tracker", set in the root layout for every page | Per-route titles | One app, one title; root placement keeps it on the error page |
| Home page composition | One page showing routines then the usage table | Separate pages per feature | [inferred] Small app; everything the user logs is on one screen |
| Shared +/− control | One `AddMinusButtons` component | Per-feature buttons | [inferred] Identical control in both features |
| Unused generated snippets | Delete them | Keep for possible future use | The Chakra CLI regenerates any snippet on demand |

## Open Questions & Future Decisions

### Deferred
1. **Navigation** — no header or nav exists. Needed once purchases or inventory add pages.

## References

- src/app/root.tsx, src/app/app.css, src/app/routes.ts, src/app/routes/home.tsx
- src/components/add-minus-buttons/main.tsx
- src/components/ui/
- react-router.config.ts, vite.config.ts, tsconfig.json
- docs/intent/usage/usage-design.md
- docs/arrows/app-shell.md
