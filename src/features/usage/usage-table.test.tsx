// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLoaderData } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@/components/ui/toaster";
import { sampleConfigs, sampleUsage } from "@/test/data-dir";
import { renderPage } from "@/test/render";
import { UsageTable } from "./usage-table";

type PageData = { usage: typeof sampleUsage; categories?: Record<string, string[]> };

function Page() {
  const { usage, categories } = useLoaderData() as PageData;
  return <UsageTable usage={usage} categories={categories as Record<string, string[]>} />;
}

function renderTable(data: PageData = { usage: sampleUsage, categories: sampleConfigs.categories }) {
  const loader = vi.fn(() => data);
  renderPage(Page, loader);
  return loader;
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
  it("shows one row per product with category, name, brand, overall uses, and this month's uses", async () => {
    renderTable();
    for (const header of ["Category", "Product", "Brand", "Overall Uses", "This Month's Uses"]) {
      expect(await screen.findByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("row")).toHaveLength(sampleUsage.length + 1);
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
