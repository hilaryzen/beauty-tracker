import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createRoutesStub } from "react-router";
import { vi } from "vitest";
import { Provider } from "@/components/ui/provider";
import { Toaster } from "@/components/ui/toaster";

// next-themes reads the system color scheme through matchMedia, which jsdom lacks.
export function stubMatchMedia(prefersDark = false) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark && query.includes("dark"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Renders a page component at "/" inside a router stub, with a loader the
// test controls, so useLoaderData and revalidation work as in the app.
export function renderPage<T>(Page: () => ReactElement, loader: () => T) {
  stubMatchMedia();
  const Stub = createRoutesStub([{ path: "/", Component: Page, loader, HydrateFallback: () => null }]);
  return render(
    <Provider>
      <Stub initialEntries={["/"]} />
      <Toaster />
    </Provider>,
  );
}
