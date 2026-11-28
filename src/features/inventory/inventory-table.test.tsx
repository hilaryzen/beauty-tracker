// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLoaderData, useLocation, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleConfigs, sampleUsage } from "@/test/data-dir";
import { renderPage } from "@/test/render";
import type { ProductStatus } from "@/features/products/product-status";
import { InventoryTable } from "./inventory-table";

type PageData = { usage: typeof sampleUsage; categories?: Record<string, string[]> };

function Page() {
  const { usage, categories } = useLoaderData() as PageData;
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <InventoryTable usage={usage} categories={categories as Record<string, string[]>} />
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

// The row's cell under the column with this header.
function cellUnder(tr: HTMLElement, header: string) {
  const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
  return within(tr).getAllByRole("cell")[headers.indexOf(header)];
}

async function productOrder() {
  await screen.findAllByRole("cell");
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((tr) => cellUnder(tr, "Product").textContent);
}

// Every product with the same status, so ordering tests isolate what comes after status.
function sameStatus(usage: typeof sampleUsage, status: ProductStatus = "Opened") {
  return usage.map((product) => ({ ...product, status }));
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
});

describe("inventory table display", () => {
  // @spec INV-UI-001
  it("shows category, name, brand, overall uses, and this month's uses for each product row", async () => {
    renderTable();
    for (const header of ["Category", "Product", "Brand", "Overall Uses", "This Month's Uses"]) {
      expect(await screen.findByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    const primer = await row("Hydro Grip Primer");
    expect(within(primer).getByText("Primer")).toBeInTheDocument();
    expect(within(primer).getByText("Milk Makeup")).toBeInTheDocument();
  });

  // @spec INV-UI-002
  it("orders rows by category position across all groups in configured group order", async () => {
    renderTable({
      usage: sameStatus(sampleUsage),
      categories: { makeup: ["Foundation", "Primer"], skincare: ["Cleanser"] },
    });
    expect(await productOrder()).toEqual([
      "Cushion Glass Original",
      "Hydro Grip Primer",
      "Blueberry Bounce Gentle Cleanser",
    ]);
  });

  // @spec INV-UI-003
  it("keeps stored order for products in the same category", async () => {
    const usage = [
      { ...sampleUsage[0], id: 0, name: "Primer B" },
      { ...sampleUsage[2] },
      { ...sampleUsage[0], id: 5, name: "Primer A" },
    ];
    renderTable({ usage: sameStatus(usage), categories: sampleConfigs.categories });
    await screen.findByText("Primer B");
    expect(await productOrder()).toEqual(["Blueberry Bounce Gentle Cleanser", "Primer B", "Primer A"]);
  });

  // @spec INV-UI-004
  it("shows overall uses as past months plus the current month", async () => {
    renderTable();
    const primer = await row("Hydro Grip Primer");
    // 25 in September plus 2 this month.
    expect(within(primer).getByText("27")).toBeInTheDocument();
  });

  // @spec INV-UI-005
  it("shows a + and a − control on every row", async () => {
    renderTable();
    for (const product of sampleUsage) {
      const tr = await row(product.name);
      expect(within(tr).getByRole("button", { name: "+" })).toBeInTheDocument();
      expect(within(tr).getByRole("button", { name: "-" })).toBeInTheDocument();
    }
  });

  // @spec INV-UI-006
  it("shows rows in stored order when there are no categories", async () => {
    renderTable({ usage: sameStatus(sampleUsage) });
    expect(await productOrder()).toEqual(sampleUsage.map((item) => item.name));
  });
});

describe("a product's status in the inventory table", () => {
  function product(name: string, category: string, status: string | undefined) {
    const record: Record<string, unknown> = { ...sampleUsage[0], name, category, status };
    if (status === undefined) delete record.status;
    return record as unknown as (typeof sampleUsage)[number];
  }

  // @spec INV-UI-038
  it("orders rows by status: In Progress, Opened, Backlog, Panned, Decluttered", async () => {
    const usage = [
      product("Decluttered one", "Primer", "Decluttered"),
      product("Backlog one", "Primer", "Backlog"),
      product("Panned one", "Primer", "Panned"),
      product("In Progress one", "Primer", "In Progress"),
      product("Opened one", "Primer", "Opened"),
    ];
    renderTable({ usage, categories: sampleConfigs.categories });
    expect(await productOrder()).toEqual(["In Progress one", "Opened one", "Backlog one", "Panned one", "Decluttered one"]);
  });

  // @spec INV-UI-038, INV-UI-002
  it("orders by status before category, then by category within a status", async () => {
    // Configured category order: Cleanser, Primer, Foundation.
    const usage = [
      product("Backlog cleanser", "Cleanser", "Backlog"),
      product("In Progress foundation", "Foundation", "In Progress"),
      product("Backlog primer", "Primer", "Backlog"),
      product("In Progress cleanser", "Cleanser", "In Progress"),
    ];
    renderTable({ usage, categories: sampleConfigs.categories });
    expect(await productOrder()).toEqual(["In Progress cleanser", "In Progress foundation", "Backlog cleanser", "Backlog primer"]);
  });

  // @spec INV-UI-038, INV-UI-006
  it("orders by status, then stored order, when there are no categories", async () => {
    const usage = [
      product("Backlog one", "Cleanser", "Backlog"),
      product("In Progress one", "Primer", "In Progress"),
      product("Backlog two", "Primer", "Backlog"),
    ];
    renderTable({ usage });
    expect(await productOrder()).toEqual(["In Progress one", "Backlog one", "Backlog two"]);
  });

  // @spec INV-UI-038
  it("orders by status within a group tab", async () => {
    const usage = [
      product("Backlog primer", "Primer", "Backlog"),
      product("Opened foundation", "Foundation", "Opened"),
      product("In Progress cleanser", "Cleanser", "In Progress"),
    ];
    renderTable({ usage, categories: sampleConfigs.categories }, "/?group=makeup");
    expect(await productOrder()).toEqual(["Opened foundation", "Backlog primer"]);
  });

  // @spec INV-UI-039, INV-UI-003
  it("sorts products with no status or an unrecognized one together after Decluttered, in stored order", async () => {
    const usage = [
      product("Unknown status", "Primer", "Used up"),
      product("Decluttered one", "Foundation", "Decluttered"),
      product("No status", "Primer", undefined),
      product("Lowercase status", "Primer", "in progress"),
    ];
    renderTable({ usage, categories: sampleConfigs.categories });
    expect(await productOrder()).toEqual(["Decluttered one", "Unknown status", "No status", "Lowercase status"]);
  });

  // @spec INV-UI-040
  it("shows a Status column first, before Category", async () => {
    renderTable();
    await screen.findAllByRole("cell");
    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(headers.slice(0, 2)).toEqual(["Status", "Category"]);
    expect(within(await row("Hydro Grip Primer")).getAllByRole("cell")).toHaveLength(headers.length);
  });

  // @spec INV-UI-041
  it("shows each status as stored", async () => {
    const statuses = ["Backlog", "Opened", "In Progress", "Panned", "Decluttered"];
    renderTable({ usage: statuses.map((status) => product(`${status} one`, "Primer", status)), categories: sampleConfigs.categories });
    for (const status of statuses) {
      expect(cellUnder(await row(`${status} one`), "Status").textContent).toBe(status);
    }
  });

  // @spec INV-UI-042
  it("leaves the Status cell empty for a product with no status or an unrecognized one", async () => {
    const usage = [product("No status", "Primer", undefined), product("Unknown status", "Primer", "Used up")];
    renderTable({ usage, categories: sampleConfigs.categories });
    expect(cellUnder(await row("No status"), "Status").textContent).toBe("");
    expect(cellUnder(await row("Unknown status"), "Status").textContent).toBe("");
  });
});

describe("a product's shade in the inventory table", () => {
  function productCell(tr: HTMLElement) {
    return cellUnder(tr, "Product");
  }

  // @spec INV-UI-011
  it("shows the name, an en dash, and the shade as plain text in the Product column", async () => {
    renderTable({ usage: [{ ...sampleUsage[0], shade: "Berry" }, ...sampleUsage.slice(1)], categories: sampleConfigs.categories });
    const cell = productCell(await row("Hydro Grip Primer – Berry"));
    expect(cell.textContent).toBe("Hydro Grip Primer – Berry");
    // One plain text node: no element can give the shade a style of its own.
    expect(cell.children).toHaveLength(0);
  });

  // @spec INV-UI-012
  it("shows only the name in the Product column for a product without a shade", async () => {
    renderTable();
    const cell = productCell(await row("Hydro Grip Primer"));
    expect(cell.textContent).toBe("Hydro Grip Primer");
  });
});

describe("a product's dates in the inventory table", () => {
  const DATE_COLUMNS = ["Purchased", "Opened", "Expires", "Removed"];

  function headers() {
    return screen.getAllByRole("columnheader").map((header) => header.textContent);
  }

  // The text of the row's Purchased, Opened, Expires, and Removed cells, found by their headers' positions.
  function dateCells(tr: HTMLElement) {
    const cells = within(tr).getAllByRole("cell");
    return DATE_COLUMNS.map((column) => cells[headers().indexOf(column)].textContent);
  }

  const dated = {
    ...sampleUsage[0],
    purchase: { date: "2026-09-14", store: "Sephora", price: 3200 },
    opened: "2026-09-20",
    expires: "2027-09-20",
    removed: "2026-10-05",
  };

  // @spec INV-UI-026
  it("shows Purchased, Opened, Expires, and Removed columns after This Month's Uses and before the controls", async () => {
    renderTable();
    await screen.findAllByRole("cell");
    const all = headers();
    const at = all.indexOf("This Month's Uses");
    expect(all.slice(at + 1, at + 5)).toEqual(DATE_COLUMNS);
    // The +/− and edit controls stay in the last column.
    const cells = within(await row("Hydro Grip Primer")).getAllByRole("cell");
    expect(cells).toHaveLength(all.length);
    expect(within(cells.at(-1) as HTMLElement).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  // @spec INV-UI-027, INV-UI-028
  it("shows each date as stored, in YYYY-MM-DD form", async () => {
    renderTable({ usage: [dated, ...sampleUsage.slice(1)], categories: sampleConfigs.categories });
    expect(dateCells(await row("Hydro Grip Primer"))).toEqual(["2026-09-14", "2026-09-20", "2027-09-20", "2026-10-05"]);
  });

  // @spec INV-UI-029, INV-UI-030
  it("leaves a date cell empty when the product has no such date", async () => {
    renderTable({
      usage: [{ ...sampleUsage[0], expires: "2027-01-01" }, ...sampleUsage.slice(1)],
      categories: sampleConfigs.categories,
    });
    expect(dateCells(await row("Hydro Grip Primer"))).toEqual(["", "", "2027-01-01", ""]);
    expect(dateCells(await row("Cushion Glass Original"))).toEqual(["", "", "", ""]);
  });

  // @spec INV-UI-029
  it("leaves the Purchased cell empty for a product with no purchase, while showing its other dates", async () => {
    const { purchase: _purchase, ...unbought } = dated;
    renderTable({ usage: [unbought, ...sampleUsage.slice(1)], categories: sampleConfigs.categories });
    expect(dateCells(await row("Hydro Grip Primer"))).toEqual(["", "2026-09-20", "2027-09-20", "2026-10-05"]);
  });
});

describe("a product's size, cost, and rating in the inventory table", () => {
  const COLUMNS = ["Size", "Cost", "Rating"];

  function headers() {
    return screen.getAllByRole("columnheader").map((header) => header.textContent);
  }

  // The text of the row's Size, Cost, and Rating cells, found by their headers' positions.
  function detailCells(tr: HTMLElement) {
    const cells = within(tr).getAllByRole("cell");
    return COLUMNS.map((column) => cells[headers().indexOf(column)].textContent);
  }

  function withPrimer(changes: Record<string, unknown>) {
    return { usage: [{ ...sampleUsage[0], ...changes }, ...sampleUsage.slice(1)], categories: sampleConfigs.categories } as PageData;
  }

  // @spec INV-UI-031
  it("shows Size, Cost, and Rating columns after Brand and before Overall Uses", async () => {
    renderTable();
    await screen.findAllByRole("cell");
    const all = headers();
    const at = all.indexOf("Brand");
    expect(all.slice(at + 1, at + 5)).toEqual([...COLUMNS, "Overall Uses"]);
    expect(within(await row("Hydro Grip Primer")).getAllByRole("cell")).toHaveLength(all.length);
  });

  // @spec INV-UI-032, INV-UI-034, INV-UI-036
  it("shows the size, the purchase price, and the rating", async () => {
    renderTable(withPrimer({
      size: { amount: 1.7, unit: "fl oz" },
      purchase: { date: "2026-09-14", price: 3200 },
      rating: 4,
    }));
    expect(detailCells(await row("Hydro Grip Primer"))).toEqual(["1.7 fl oz", "$32.00", "4"]);
  });

  // @spec INV-UI-032
  it.each([
    [{ amount: 50, unit: "mL" }, "50 mL"],
    [{ amount: 0.25, unit: "oz" }, "0.25 oz"],
    [{ amount: 7.5, unit: "g" }, "7.5 g"],
  ])("writes the size %o as %s", async (size, text) => {
    renderTable(withPrimer({ size }));
    expect(detailCells(await row("Hydro Grip Primer"))[0]).toBe(text);
  });

  // @spec INV-UI-034
  it.each([
    [0, "$0.00"],
    [1999, "$19.99"],
    [120000, "$1,200.00"],
  ])("shows a purchase price of %i cents as the purchase list does: %s", async (price, text) => {
    renderTable(withPrimer({ purchase: { date: "2026-09-14", price } }));
    expect(detailCells(await row("Hydro Grip Primer"))[1]).toBe(text);
  });

  // @spec INV-UI-033, INV-UI-035, INV-UI-037
  it("leaves the Size, Cost, and Rating cells empty when the product has none", async () => {
    renderTable(withPrimer({ rating: 2 }));
    expect(detailCells(await row("Hydro Grip Primer"))).toEqual(["", "", "2"]);
    expect(detailCells(await row("Cushion Glass Original"))).toEqual(["", "", ""]);
  });

  // @spec INV-UI-033
  it.each([
    ["a string", "1.7 fl oz"],
    ["an unknown unit", { amount: 30, unit: "ml" }],
    ["a zero amount", { amount: 0, unit: "g" }],
    ["a text amount", { amount: "30", unit: "g" }],
  ])("leaves the Size cell empty when the size is %s", async (_, size) => {
    renderTable(withPrimer({ size }));
    expect(detailCells(await row("Hydro Grip Primer"))[0]).toBe("");
  });

  // @spec INV-UI-037
  it.each([0, 6, 3.5, "4"])("leaves the Rating cell empty when the rating is %s", async (rating) => {
    renderTable(withPrimer({ rating }));
    expect(detailCells(await row("Hydro Grip Primer"))[2]).toBe("");
  });
});

describe("opening the product dialog", () => {
  // @spec INV-UI-007
  it("shows an Add product button above the rows", async () => {
    renderTable();
    const add = await screen.findByRole("button", { name: "Add product" });
    expect(add.closest("tr")).toBeNull();
    const table = screen.getByRole("table");
    expect(add.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // @spec INV-UI-007
  it("shows the Add product button when there are no products", async () => {
    renderTable({ usage: [], categories: sampleConfigs.categories });
    expect(await screen.findByRole("button", { name: "Add product" })).toBeInTheDocument();
  });

  // @spec INV-UI-008
  it("shows an edit button on every row", async () => {
    renderTable();
    for (const product of sampleUsage) {
      const tr = await row(product.name);
      expect(within(tr).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    }
  });

  // @spec INV-UI-009
  it("opens an empty product dialog from the Add product button", async () => {
    renderTable();
    fireEvent.click(await screen.findByRole("button", { name: "Add product" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Add product" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Name")).toHaveValue("");
  });

  // @spec INV-UI-010
  it("opens the product dialog for the row's product from its edit button", async () => {
    renderTable();
    fireEvent.click(within(await row("Cushion Glass Original")).getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Edit product" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Cushion Glass Original");
  });

  // @spec INV-UI-009
  it("opens empty again after editing a product and cancelling", async () => {
    renderTable();
    fireEvent.click(within(await row("Cushion Glass Original")).getByRole("button", { name: "Edit" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(await screen.findByRole("button", { name: "Add product" }));
    expect(within(await screen.findByRole("dialog")).getByLabelText("Name")).toHaveValue("");
  });
});

describe("logging from the inventory table", () => {
  // @spec INV-LOG-001
  it("sends a +1 for the row's product when + is clicked", async () => {
    renderTable();
    fireEvent.click(within(await row("Cushion Glass Original")).getByRole("button", { name: "+" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({ ids: [1], delta: 1 });
  });

  // @spec INV-LOG-002
  it("sends a -1 for the row's product when − is clicked", async () => {
    renderTable();
    fireEvent.click(within(await row("Hydro Grip Primer")).getByRole("button", { name: "-" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({ ids: [0], delta: -1 });
  });
});

describe("inventory table group tabs", () => {
  // @spec INV-UI-013
  it("shows an All tab, then one tab per group in configured order", async () => {
    renderTable({ usage: sampleUsage, categories: { makeup: ["Primer", "Foundation"], skincare: ["Cleanser"], lips: [] } });
    expect(await tabNames()).toEqual(["All", "makeup", "skincare", "lips"]);
  });

  // @spec INV-UI-014
  it("shows one row per product on the All tab", async () => {
    renderTable();
    expect(await selectedTab()).toEqual(["All"]);
    expect(await productOrder()).toHaveLength(sampleUsage.length);
  });

  // @spec INV-UI-015
  it("shows only the products whose category is in the selected group", async () => {
    renderTable(undefined, "/?group=makeup");
    expect(await productOrder()).toEqual(["Hydro Grip Primer", "Cushion Glass Original"]);
  });

  // @spec INV-UI-016
  it("shows a message in place of rows for a group with no products", async () => {
    renderTable(undefined, "/?group=lips");
    expect(await screen.findByText("No products in this group.")).toBeInTheDocument();
    expect(screen.queryByText("Hydro Grip Primer")).toBeNull();
  });

  // @spec INV-UI-016
  it("does not show the empty-group message on a group with products", async () => {
    renderTable(undefined, "/?group=skincare");
    await screen.findByText("Blueberry Bounce Gentle Cleanser");
    expect(screen.queryByText("No products in this group.")).toBeNull();
  });

  // @spec INV-UI-017
  it("shows only the All tab when there are no categories", async () => {
    renderTable({ usage: sampleUsage });
    expect(await tabNames()).toEqual(["All"]);
  });

  // @spec INV-UI-018
  it("selects the group named in the URL's group parameter", async () => {
    renderTable(undefined, "/?group=skincare");
    expect(await selectedTab()).toEqual(["skincare"]);
  });

  // @spec INV-UI-018
  it("keeps the selected group after a logged use reloads the page data", async () => {
    const loader = renderTable(undefined, "/?group=makeup");
    fireEvent.click(within(await row("Hydro Grip Primer")).getByRole("button", { name: "+" }));
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    expect(await selectedTab()).toEqual(["makeup"]);
    expect(await productOrder()).toEqual(["Hydro Grip Primer", "Cushion Glass Original"]);
  });

  // @spec INV-UI-019
  it("selects the All tab when the URL has no group parameter", async () => {
    renderTable(undefined, "/");
    expect(await selectedTab()).toEqual(["All"]);
  });

  // @spec INV-UI-020
  it("selects the All tab and shows every product when the group parameter names no group", async () => {
    renderTable(undefined, "/?group=Makeup");
    expect(await selectedTab()).toEqual(["All"]);
    expect(await productOrder()).toHaveLength(sampleUsage.length);
  });

  // @spec INV-UI-021
  it("sets the group parameter when a group tab is selected", async () => {
    renderTable();
    fireEvent.click(await screen.findByRole("tab", { name: "skincare" }));
    await waitFor(() => expect(currentSearch()).toBe("?group=skincare"));
    expect(await selectedTab()).toEqual(["skincare"]);
    expect(await productOrder()).toEqual(["Blueberry Bounce Gentle Cleanser"]);
  });

  // @spec INV-UI-022
  it("removes the group parameter when the All tab is selected", async () => {
    renderTable(undefined, "/?group=skincare");
    fireEvent.click(await screen.findByRole("tab", { name: "All" }));
    await waitFor(() => expect(currentSearch()).toBe(""));
    expect(await selectedTab()).toEqual(["All"]);
  });

  // @spec INV-UI-023
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

  // @spec INV-UI-013
  it("names each group's tab panel after its tab, even when the group name has a space", async () => {
    renderTable(
      { usage: sampleUsage, categories: { "body care": ["Cleanser"], makeup: ["Primer", "Foundation"] } },
      "/?group=body%20care",
    );
    expect(await screen.findByRole("tabpanel", { name: "body care" })).toBeInTheDocument();
  });

  // @spec INV-UI-025
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

  // @spec INV-UI-024
  it("leaves the URL unchanged when the selected tab is clicked", async () => {
    renderTable(undefined, "/?group=hair");
    fireEvent.click(await screen.findByRole("tab", { name: "All" }));
    // Give any navigation a chance to happen before checking it did not.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(currentSearch()).toBe("?group=hair");
  });
});
