// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLoaderData, useLocation, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@/components/ui/toaster";
import { sampleConfigs, sampleUsage } from "@/test/data-dir";
import { renderPage } from "@/test/render";
import { UsageTable } from "./usage-table";

type PageData = { usage: typeof sampleUsage; categories?: Record<string, string[]> };

function Page() {
  const { usage, categories } = useLoaderData() as PageData;
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <UsageTable usage={usage} categories={categories as Record<string, string[]>} />
      {/* Test-only probes: the current URL's search string, and a browser Back. */}
      <output data-testid="search">{location.search}</output>
      <button onClick={() => navigate(-1)}>Test back</button>
    </>
  );
}

function renderTable(data: PageData = { usage: sampleUsage, categories: sampleConfigs.categories }, url = "/") {
  const loader = vi.fn(() => data);
  renderPage(Page, loader, url);
  return loader;
}

function currentSearch() {
  return screen.getByTestId("search").textContent;
}

async function tabNames() {
  return (await screen.findAllByRole("tab")).map((tab) => tab.textContent);
}

async function selectedTab() {
  const tabs = await screen.findAllByRole("tab");
  return tabs.filter((tab) => tab.getAttribute("aria-selected") === "true").map((tab) => tab.textContent);
}

async function row(name: string) {
  return (await screen.findByText(name)).closest("tr") as HTMLElement;
}

async function productOrder() {
  await screen.findAllByRole("cell");
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((tr) => within(tr).getAllByRole("cell")[1].textContent);
}

function requestBody(call: unknown[]) {
  return JSON.parse((call[1] as RequestInit).body as string);
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("null", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  // The toaster is shared across renders; clear it so one test's notification can't satisfy another's.
  toaster.remove();
});

describe("usage table display", () => {
  // @spec USAGE-UI-001
  it("shows category, name, brand, overall uses, and this month's uses for each product row", async () => {
    renderTable();
    for (const header of ["Category", "Product", "Brand", "Overall Uses", "This Month's Uses"]) {
      expect(await screen.findByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    const primer = await row("Hydro Grip Primer");
    expect(within(primer).getByText("Primer")).toBeInTheDocument();
    expect(within(primer).getByText("Milk Makeup")).toBeInTheDocument();
  });

  // @spec USAGE-UI-002
  it("orders rows by category position across all groups in configured group order", async () => {
    renderTable({
      usage: sampleUsage,
      categories: { makeup: ["Foundation", "Primer"], skincare: ["Cleanser"] },
    });
    expect(await productOrder()).toEqual([
      "Cushion Glass Original",
      "Hydro Grip Primer",
      "Blueberry Bounce Gentle Cleanser",
    ]);
  });

  // @spec USAGE-UI-003
  it("keeps stored order for products in the same category", async () => {
    const usage = [
      { ...sampleUsage[0], id: 0, name: "Primer B" },
      { ...sampleUsage[2] },
      { ...sampleUsage[0], id: 5, name: "Primer A" },
    ];
    renderTable({ usage, categories: sampleConfigs.categories });
    await screen.findByText("Primer B");
    expect(await productOrder()).toEqual(["Blueberry Bounce Gentle Cleanser", "Primer B", "Primer A"]);
  });

  // @spec USAGE-UI-004
  it("shows overall uses as past months plus the current month", async () => {
    renderTable();
    const primer = await row("Hydro Grip Primer");
    // 25 in September plus 2 this month.
    expect(within(primer).getByText("27")).toBeInTheDocument();
  });

  // @spec USAGE-UI-005
  it("shows a + and a − control on every row", async () => {
    renderTable();
    for (const product of sampleUsage) {
      const tr = await row(product.name);
      expect(within(tr).getByRole("button", { name: "+" })).toBeInTheDocument();
      expect(within(tr).getByRole("button", { name: "-" })).toBeInTheDocument();
    }
  });

  // @spec USAGE-UI-006
  it("shows rows in stored order when there are no categories", async () => {
    renderTable({ usage: sampleUsage });
    expect(await productOrder()).toEqual(sampleUsage.map((item) => item.name));
  });
});

describe("a product's shade in the usage table", () => {
  function productCell(tr: HTMLElement) {
    return within(tr).getAllByRole("cell")[1];
  }

  // @spec USAGE-UI-011
  it("shows the name, an en dash, and the shade as plain text in the Product column", async () => {
    renderTable({ usage: [{ ...sampleUsage[0], shade: "Berry" }, ...sampleUsage.slice(1)], categories: sampleConfigs.categories });
    const cell = productCell(await row("Hydro Grip Primer – Berry"));
    expect(cell.textContent).toBe("Hydro Grip Primer – Berry");
    // One plain text node: no element can give the shade a style of its own.
    expect(cell.children).toHaveLength(0);
  });

  // @spec USAGE-UI-012
  it("shows only the name in the Product column for a product without a shade", async () => {
    renderTable();
    const cell = productCell(await row("Hydro Grip Primer"));
    expect(cell.textContent).toBe("Hydro Grip Primer");
  });
});

describe("opening the product dialog", () => {
  // @spec USAGE-UI-007
  it("shows an Add product button above the rows", async () => {
    renderTable();
    const add = await screen.findByRole("button", { name: "Add product" });
    expect(add.closest("tr")).toBeNull();
    const table = screen.getByRole("table");
    expect(add.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // @spec USAGE-UI-007
  it("shows the Add product button when there are no products", async () => {
    renderTable({ usage: [], categories: sampleConfigs.categories });
    expect(await screen.findByRole("button", { name: "Add product" })).toBeInTheDocument();
  });

  // @spec USAGE-UI-008
  it("shows an edit button on every row", async () => {
    renderTable();
    for (const product of sampleUsage) {
      const tr = await row(product.name);
      expect(within(tr).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    }
  });

  // @spec USAGE-UI-009
  it("opens an empty product dialog from the Add product button", async () => {
    renderTable();
    fireEvent.click(await screen.findByRole("button", { name: "Add product" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Add product" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Name")).toHaveValue("");
  });

  // @spec USAGE-UI-010
  it("opens the product dialog for the row's product from its edit button", async () => {
    renderTable();
    fireEvent.click(within(await row("Cushion Glass Original")).getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Edit product" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Cushion Glass Original");
  });

  // @spec USAGE-UI-009
  it("opens empty again after editing a product and cancelling", async () => {
    renderTable();
    fireEvent.click(within(await row("Cushion Glass Original")).getByRole("button", { name: "Edit" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(await screen.findByRole("button", { name: "Add product" }));
    expect(within(await screen.findByRole("dialog")).getByLabelText("Name")).toHaveValue("");
  });
});

describe("logging from the usage table", () => {
  // @spec USAGE-LOG-001
  it("sends a +1 for the row's product when + is clicked", async () => {
    renderTable();
    fireEvent.click(within(await row("Cushion Glass Original")).getByRole("button", { name: "+" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({ ids: [1], delta: 1 });
  });

  // @spec USAGE-LOG-002
  it("sends a -1 for the row's product when − is clicked", async () => {
    renderTable();
    fireEvent.click(within(await row("Hydro Grip Primer")).getByRole("button", { name: "-" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({ ids: [0], delta: -1 });
  });

  // @spec USAGE-LOG-004
  it("sends a single POST to /api/usage with { ids, delta }", async () => {
    renderTable();
    fireEvent.click(within(await row("Hydro Grip Primer")).getByRole("button", { name: "+" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toMatch(/\/api\/usage$/);
    expect(init.method?.toUpperCase()).toBe("POST");
    expect(Object.keys(requestBody(fetchMock.mock.calls[0])).sort()).toEqual(["delta", "ids"]);
  });

  // @spec USAGE-LOG-005
  it("reloads the page data after a successful save", async () => {
    const loader = renderTable();
    await row("Hydro Grip Primer");
    expect(loader).toHaveBeenCalledTimes(1);
    fireEvent.click(within(await row("Hydro Grip Primer")).getByRole("button", { name: "+" }));
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  });

  // @spec USAGE-LOG-007
  it("shows an error notification when the save fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "disk full" }), { status: 500 }),
    );
    renderTable();
    fireEvent.click(within(await row("Hydro Grip Primer")).getByRole("button", { name: "+" }));
    expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
  });

  // @spec USAGE-LOG-008
  it("keeps showing the last saved data when the save fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "bad id" }), { status: 400 }),
    );
    const loader = renderTable();
    const primer = await row("Hydro Grip Primer");
    fireEvent.click(within(primer).getByRole("button", { name: "+" }));
    await screen.findByText(/not saved/i);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(within(await row("Hydro Grip Primer")).getByText("27")).toBeInTheDocument();
  });

  // @spec USAGE-LOG-009
  it("sends a new request without cancelling one still in flight", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    renderTable();
    const plus = within(await row("Hydro Grip Primer")).getByRole("button", { name: "+" });
    fireEvent.click(plus);
    fireEvent.click(plus);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const firstSignal = (fetchMock.mock.calls[0][1] as RequestInit | undefined)?.signal;
    expect(firstSignal?.aborted ?? false).toBe(false);
  });

  // @spec USAGE-LOG-010
  it("shows an error notification when the request gets no response", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderTable();
    fireEvent.click(within(await row("Hydro Grip Primer")).getByRole("button", { name: "+" }));
    expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
  });

  // @spec USAGE-LOG-011
  it("keeps showing the last saved data when the request gets no response", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const loader = renderTable();
    fireEvent.click(within(await row("Hydro Grip Primer")).getByRole("button", { name: "+" }));
    await screen.findByText(/not saved/i);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(within(await row("Hydro Grip Primer")).getByText("27")).toBeInTheDocument();
  });
});

describe("usage table group tabs", () => {
  // @spec USAGE-UI-013
  it("shows an All tab, then one tab per group in configured order", async () => {
    renderTable({ usage: sampleUsage, categories: { makeup: ["Primer", "Foundation"], skincare: ["Cleanser"], lips: [] } });
    expect(await tabNames()).toEqual(["All", "makeup", "skincare", "lips"]);
  });

  // @spec USAGE-UI-014
  it("shows one row per product on the All tab", async () => {
    renderTable();
    expect(await selectedTab()).toEqual(["All"]);
    expect(await productOrder()).toHaveLength(sampleUsage.length);
  });

  // @spec USAGE-UI-015
  it("shows only the products whose category is in the selected group", async () => {
    renderTable(undefined, "/?group=makeup");
    expect(await productOrder()).toEqual(["Hydro Grip Primer", "Cushion Glass Original"]);
  });

  // @spec USAGE-UI-016
  it("shows a message in place of rows for a group with no products", async () => {
    renderTable(undefined, "/?group=lips");
    expect(await screen.findByText("No products in this group.")).toBeInTheDocument();
    expect(screen.queryByText("Hydro Grip Primer")).toBeNull();
  });

  // @spec USAGE-UI-016
  it("does not show the empty-group message on a group with products", async () => {
    renderTable(undefined, "/?group=skincare");
    await screen.findByText("Blueberry Bounce Gentle Cleanser");
    expect(screen.queryByText("No products in this group.")).toBeNull();
  });

  // @spec USAGE-UI-017
  it("shows only the All tab when there are no categories", async () => {
    renderTable({ usage: sampleUsage });
    expect(await tabNames()).toEqual(["All"]);
  });

  // @spec USAGE-UI-018
  it("selects the group named in the URL's group parameter", async () => {
    renderTable(undefined, "/?group=skincare");
    expect(await selectedTab()).toEqual(["skincare"]);
  });

  // @spec USAGE-UI-018
  it("keeps the selected group after a logged use reloads the page data", async () => {
    const loader = renderTable(undefined, "/?group=makeup");
    fireEvent.click(within(await row("Hydro Grip Primer")).getByRole("button", { name: "+" }));
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    expect(await selectedTab()).toEqual(["makeup"]);
    expect(await productOrder()).toEqual(["Hydro Grip Primer", "Cushion Glass Original"]);
  });

  // @spec USAGE-UI-019
  it("selects the All tab when the URL has no group parameter", async () => {
    renderTable(undefined, "/");
    expect(await selectedTab()).toEqual(["All"]);
  });

  // @spec USAGE-UI-020
  it("selects the All tab and shows every product when the group parameter names no group", async () => {
    renderTable(undefined, "/?group=Makeup");
    expect(await selectedTab()).toEqual(["All"]);
    expect(await productOrder()).toHaveLength(sampleUsage.length);
  });

  // @spec USAGE-UI-021
  it("sets the group parameter when a group tab is selected", async () => {
    renderTable();
    fireEvent.click(await screen.findByRole("tab", { name: "skincare" }));
    await waitFor(() => expect(currentSearch()).toBe("?group=skincare"));
    expect(await selectedTab()).toEqual(["skincare"]);
    expect(await productOrder()).toEqual(["Blueberry Bounce Gentle Cleanser"]);
  });

  // @spec USAGE-UI-022
  it("removes the group parameter when the All tab is selected", async () => {
    renderTable(undefined, "/?group=skincare");
    fireEvent.click(await screen.findByRole("tab", { name: "All" }));
    await waitFor(() => expect(currentSearch()).toBe(""));
    expect(await selectedTab()).toEqual(["All"]);
  });

  // @spec USAGE-UI-023
  it("adds a history entry for each tab change, so Back returns to the previous tab", async () => {
    renderTable();
    fireEvent.click(await screen.findByRole("tab", { name: "skincare" }));
    await waitFor(() => expect(currentSearch()).toBe("?group=skincare"));
    fireEvent.click(screen.getByRole("tab", { name: "makeup" }));
    await waitFor(() => expect(currentSearch()).toBe("?group=makeup"));
    fireEvent.click(screen.getByRole("button", { name: "Test back" }));
    await waitFor(() => expect(currentSearch()).toBe("?group=skincare"));
    expect(await selectedTab()).toEqual(["skincare"]);
  });

  // @spec USAGE-UI-013
  it("names each group's tab panel after its tab, even when the group name has a space", async () => {
    renderTable(
      { usage: sampleUsage, categories: { "body care": ["Cleanser"], makeup: ["Primer", "Foundation"] } },
      "/?group=body%20care",
    );
    expect(await screen.findByRole("tabpanel", { name: "body care" })).toBeInTheDocument();
  });

  // @spec USAGE-UI-025
  it("moves focus without selecting a tab when the arrow keys are used", async () => {
    renderTable();
    const all = await screen.findByRole("tab", { name: "All" });
    all.focus();
    // Two presses: in jsdom, a tab selected by an arrow key is the one focused
    // before that press, so a single press from "All" would not reveal it.
    fireEvent.keyDown(all, { key: "ArrowRight" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("tab", { name: "skincare" })));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("tab", { name: "makeup" })));
    // Give any navigation a chance to happen before checking it did not.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await selectedTab()).toEqual(["All"]);
    expect(currentSearch()).toBe("");
  });

  // @spec USAGE-UI-024
  it("leaves the URL unchanged when the selected tab is clicked", async () => {
    renderTable(undefined, "/?group=hair");
    fireEvent.click(await screen.findByRole("tab", { name: "All" }));
    // Give any navigation a chance to happen before checking it did not.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(currentSearch()).toBe("?group=hair");
  });
});
