// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { createRoutesStub, Outlet, useLoaderData } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleConfigs, sampleUsage } from "@/test/data-dir";
import { responsiveStyles } from "@/test/css";
import { stubMatchMedia } from "@/test/render";
import { ErrorBoundary, Shell } from "./root";
import Home from "./routes/home";
import Purchases from "./routes/purchases";
import Settings from "./routes/settings";

type HomeProps = Parameters<typeof Home>[0];
type PurchasesProps = Parameters<typeof Purchases>[0];
type SettingsProps = Parameters<typeof Settings>[0];
type ErrorProps = Parameters<typeof ErrorBoundary>[0];

function HomePage() {
  const loaderData = useLoaderData();
  return <Home {...({ loaderData } as HomeProps)} />;
}

function PurchasesPage() {
  const loaderData = useLoaderData();
  return <Purchases {...({ loaderData } as PurchasesProps)} />;
}

function SettingsPage() {
  const loaderData = useLoaderData();
  return <Settings {...({ loaderData } as SettingsProps)} />;
}

const purchasesData = () => ({ usage: sampleUsage, categories: sampleConfigs.categories });

const settingsData = () => ({
  usage: sampleUsage,
  categories: sampleConfigs.categories,
  routines: sampleConfigs.routines,
});

const homeData = () => ({
  usage: sampleUsage,
  categories: sampleConfigs.categories,
  routines: sampleConfigs.routines,
});

// Mirrors the app's route tree: React Router renders Layout (and so Shell)
// around both the route tree and the root error boundary.
function renderApp(path: string, homeLoader: () => unknown = homeData) {
  stubMatchMedia();
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <Shell>
          <Outlet />
        </Shell>
      ),
      ErrorBoundary: (props: ErrorProps) => (
        <Shell>
          <ErrorBoundary {...props} />
        </Shell>
      ),
      HydrateFallback: () => null,
      children: [
        { index: true, Component: HomePage, loader: homeLoader },
        { path: "purchases", Component: PurchasesPage, loader: purchasesData },
        { path: "settings", Component: SettingsPage, loader: settingsData },
      ],
    },
  ]);
  return render(<Stub initialEntries={[path]} />);
}

async function header() {
  return screen.findByRole("banner");
}

function headerLink(name: string) {
  return within(screen.getByRole("banner")).getByRole("link", { name });
}

function follows(earlier: Element, later: Element) {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("navigation header", () => {
  // @spec SHELL-NAV-001
  it("shows a header above the page content on the home, purchases, and error pages", async () => {
    const home = renderApp("/");
    expect(follows(await header(), await screen.findByRole("table"))).toBe(true);
    home.unmount();

    const purchases = renderApp("/purchases");
    expect(follows(await header(), await screen.findByRole("heading", { name: "Purchases" }))).toBe(true);
    purchases.unmount();

    renderApp("/no-such-page");
    expect(follows(await header(), await screen.findByRole("heading", { name: "404" }))).toBe(true);
  });

  // @spec SHELL-NAV-002
  it("shows the app name as plain text, not a link or heading", async () => {
    renderApp("/purchases");
    const name = within(await header()).getByText("Beauty Tracker");
    expect(name.closest("a")).toBeNull();
    expect(name.closest("h1, h2, h3, h4, h5, h6, [role=heading]")).toBeNull();
  });

  // @spec SHELL-NAV-003
  it("links to Usage, then Purchases, then Settings", async () => {
    renderApp("/purchases");
    const links = within(await header()).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Usage", "Purchases", "Settings"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/", "/purchases", "/settings"]);
  });

  // @spec SHELL-NAV-004
  it("marks only Usage as the current page at /", async () => {
    renderApp("/");
    await header();
    expect(headerLink("Usage")).toHaveAttribute("aria-current", "page");
    expect(headerLink("Purchases")).not.toHaveAttribute("aria-current");
  });

  // @spec SHELL-NAV-004
  it("still marks Usage as the current page when the home page fails to load", async () => {
    renderApp("/", () => {
      throw new Response(null, { status: 500, statusText: "Your data could not be loaded." });
    });
    expect(await screen.findByRole("heading", { name: "Error" })).toBeInTheDocument();
    expect(headerLink("Usage")).toHaveAttribute("aria-current", "page");
    expect(headerLink("Purchases")).not.toHaveAttribute("aria-current");
  });

  // @spec SHELL-NAV-005
  it("marks only Purchases as the current page at /purchases", async () => {
    renderApp("/purchases");
    await header();
    expect(headerLink("Purchases")).toHaveAttribute("aria-current", "page");
    expect(headerLink("Usage")).not.toHaveAttribute("aria-current");
  });

  // @spec SHELL-NAV-009
  it("marks only Settings as the current page at /settings", async () => {
    renderApp("/settings");
    await header();
    expect(headerLink("Settings")).toHaveAttribute("aria-current", "page");
    expect(headerLink("Usage")).not.toHaveAttribute("aria-current");
    expect(headerLink("Purchases")).not.toHaveAttribute("aria-current");
  });

  // @spec SHELL-NAV-006
  it("marks no link as the current page on a path that matches no route", async () => {
    renderApp("/no-such-page");
    expect(await screen.findByRole("heading", { name: "404" })).toBeInTheDocument();
    expect(headerLink("Usage")).not.toHaveAttribute("aria-current");
    expect(headerLink("Purchases")).not.toHaveAttribute("aria-current");
  });

  // @spec SHELL-NAV-007
  it("styles the current link differently from the other links", async () => {
    renderApp("/purchases");
    await header();
    const current = getComputedStyle(headerLink("Purchases"));
    const other = getComputedStyle(headerLink("Usage"));
    const differs = ["color", "font-weight", "text-decoration-line", "border-bottom-color", "background-color"].some(
      (property) => current.getPropertyValue(property) !== other.getPropertyValue(property),
    );
    expect(differs).toBe(true);
  });

  // @spec SHELL-NAV-008
  it("shows the linked page within the running app when a header link is selected", async () => {
    renderApp("/");
    const banner = await header();
    fireEvent.click(headerLink("Purchases"));
    expect(await screen.findByRole("heading", { name: "Purchases" })).toBeInTheDocument();
    // The same header element is still mounted: the document was not reloaded.
    expect(screen.getByRole("banner")).toBe(banner);
    expect(headerLink("Purchases")).toHaveAttribute("aria-current", "page");

    fireEvent.click(headerLink("Usage"));
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBe(banner);
  });
});

describe("purchases page", () => {
  // @spec SHELL-PURCH-001
  it("shows the top-level heading Purchases", async () => {
    renderApp("/purchases");
    expect(await screen.findByRole("heading", { level: 1, name: "Purchases" })).toBeInTheDocument();
  });

  // @spec SHELL-PURCH-003
  it("shows the purchase list below the heading", async () => {
    renderApp("/purchases");
    const heading = await screen.findByRole("heading", { level: 1, name: "Purchases" });
    const addPurchase = await screen.findByRole("button", { name: "Add purchase" });
    expect(follows(heading, addPurchase)).toBe(true);
    expect(screen.getByText("No purchases yet.")).toBeInTheDocument();
    expect(screen.queryByText("Purchase tracking is coming soon.")).toBeNull();
  });
});

describe("settings page", () => {
  // @spec SHELL-SET-001
  it("shows the top-level heading Settings", async () => {
    renderApp("/settings");
    expect(await screen.findByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
  });

  // @spec SHELL-SET-002
  it("shows the category editor and the routine editor below the heading", async () => {
    renderApp("/settings");
    const heading = await screen.findByRole("heading", { level: 1, name: "Settings" });
    const addGroup = await screen.findByRole("button", { name: "Add group" });
    const addRoutine = await screen.findByRole("button", { name: "Add routine" });
    expect(follows(heading, addGroup)).toBe(true);
    expect(follows(heading, addRoutine)).toBe(true);
    expect(screen.getByRole("region", { name: "makeup" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Routine Morning Skincare" })).toBeInTheDocument();
  });

  // @spec SHELL-SET-005
  it("shows the editors side by side in equal columns, categories on the left, in wide windows", async () => {
    renderApp("/settings");
    await screen.findByRole("button", { name: "Add routine" });
    const { lg: grid } = responsiveStyles(screen.getByTestId("settings-editors"));
    expect(grid.display).toBe("grid");
    expect(grid["grid-template-columns"]).toBe("repeat(2, minmax(0, 1fr))");
    const categories = responsiveStyles(screen.getByTestId("settings-categories")).lg;
    const routines = responsiveStyles(screen.getByTestId("settings-routines")).lg;
    expect(Number(categories.order ?? 0)).toBeLessThanOrEqual(Number(routines.order ?? 0));
  });

  // @spec SHELL-SET-006
  it("stacks the editors with the routine editor first in narrow windows", async () => {
    renderApp("/settings");
    await screen.findByRole("button", { name: "Add routine" });
    const { base: grid } = responsiveStyles(screen.getByTestId("settings-editors"));
    expect(grid.display).toBe("grid");
    expect(grid["grid-template-columns"]).toBe("minmax(0, 1fr)");
    const categories = responsiveStyles(screen.getByTestId("settings-categories")).base;
    const routines = responsiveStyles(screen.getByTestId("settings-routines")).base;
    expect(Number(routines.order ?? 0)).toBeLessThan(Number(categories.order ?? 0));
  });

  // @spec SHELL-SET-007
  it("places the category editor before the routine editor in document order", async () => {
    renderApp("/settings");
    const addGroup = await screen.findByRole("button", { name: "Add group" });
    const routinesHeading = screen.getByRole("heading", { level: 2, name: "Routines" });
    expect(follows(addGroup, routinesHeading)).toBe(true);
  });
});
