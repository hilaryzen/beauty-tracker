// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { useLoaderData } from "react-router";
import { describe, expect, it } from "vitest";
import type { Product } from "@/features/products/types";
import { sampleConfigs } from "@/test/data-dir";
import { renderPage } from "@/test/render";
import { PurchaseList } from "./purchase-list";

function product(id: number, brand: string, name: string, purchase?: Product["purchase"]): Product {
  return {
    id,
    name,
    brand,
    category: "Primer",
    uses: {},
    currentMonth: "2026-11",
    usesThisMonth: 0,
    ...(purchase ? { purchase } : {}),
  };
}

// Stored out of id order, so tests can tell id order from stored order.
const usage: Product[] = [
  product(1, "fwee", "Cushion Glass Original", { date: "2026-11-07", store: "Sephora", price: 0 }),
  product(0, "Milk Makeup", "Hydro Grip Primer", { date: "2026-11-07", store: "Sephora", price: 3200 }),
  product(2, "Glow Recipe", "Blueberry Bounce Gentle Cleanser", { date: "2026-10-30", price: 1850 }),
  product(3, "Saie", "Glow Sculpt", { date: "2026-11-07", store: "ulta", price: 1000 }),
  product(4, "Rare Beauty", "Soft Pinch Liquid Blush", { date: "2026-11-07", price: 2300 }),
  product(5, "Anastasia Beverly Hills", "Brow Freeze Gel", { date: "2026-11-07", store: "Target", price: 2450 }),
  product(6, "jane iredale", "Lash Fixation Mascara"),
];

function renderList(records: Product[] = usage) {
  function Page() {
    const data = useLoaderData() as { usage: Product[]; categories: typeof sampleConfigs.categories };
    return <PurchaseList usage={data.usage} categories={data.categories} />;
  }
  renderPage(Page, () => ({ usage: records, categories: sampleConfigs.categories }));
}

async function purchases() {
  await screen.findByRole("button", { name: "Add purchase" });
  return screen.queryAllByRole("article");
}

function itemsOf(purchase: HTMLElement) {
  return within(purchase).getAllByRole("listitem");
}

describe("purchase list", () => {
  // @spec PURCH-LIST-001
  it("shows an Add purchase button", async () => {
    renderList();
    expect(await screen.findByRole("button", { name: "Add purchase" })).toBeInTheDocument();
  });

  // @spec PURCH-LIST-002
  it("groups products with the same date and store, or the same date and no store, into one purchase", async () => {
    renderList([
      ...usage,
      product(7, "Tower 28", "SOS Spray", { date: "2026-10-30", price: 2800 }),
      product(8, "Kosas", "Revealer", { date: "2026-11-07", store: "sephora", price: 3000 }),
    ]);
    const list = await purchases();
    const sizes = list.map((purchase) => itemsOf(purchase).length);
    // Nov 7: Sephora (2), sephora (1), Target (1), ulta (1), no store (1); Oct 30: no store (2)
    expect(sizes.reduce((sum, size) => sum + size, 0)).toBe(8);
    expect(list).toHaveLength(6);
    const sephora = list.find((purchase) => within(purchase).queryByText("Sephora"))!;
    expect(itemsOf(sephora)).toHaveLength(2);
    const october = list.find((purchase) => within(purchase).queryByText("Oct 30, 2026"))!;
    expect(itemsOf(october)).toHaveLength(2);
  });

  // @spec PURCH-LIST-003, PURCH-LIST-004
  it("lists purchases newest first, then by store ignoring capitalization, with no store last", async () => {
    renderList();
    const list = await purchases();
    expect(list.map((purchase) => within(purchase).getByRole("heading").textContent)).toEqual([
      expect.stringContaining("Sephora"),
      expect.stringContaining("Target"),
      expect.stringContaining("ulta"),
      expect.not.stringMatching(/Sephora|Target|ulta/),
      expect.stringContaining("Oct 30, 2026"),
    ]);
    expect(within(list[3]).getByText("Nov 7, 2026")).toBeInTheDocument();
  });

  // @spec PURCH-LIST-005
  it("shows each purchase's date as month abbreviation, day, and year", async () => {
    renderList();
    const list = await purchases();
    expect(within(list[0]).getByText("Nov 7, 2026")).toBeInTheDocument();
    expect(within(list[4]).getByText("Oct 30, 2026")).toBeInTheDocument();
  });

  // @spec PURCH-LIST-006
  it("shows the store when the purchase has one", async () => {
    renderList();
    const list = await purchases();
    expect(within(list[0]).getByText("Sephora")).toBeInTheDocument();
    expect(within(list[4]).getByRole("heading").textContent).toBe("Oct 30, 2026");
  });

  // @spec PURCH-LIST-007, PURCH-LIST-009
  it("shows each purchase's total in dollars with two decimal places", async () => {
    renderList();
    const list = await purchases();
    expect(within(list[0]).getByText("Total $32.00")).toBeInTheDocument();
    expect(within(list[4]).getByText("Total $18.50")).toBeInTheDocument();
  });

  // @spec PURCH-LIST-008, PURCH-LIST-009
  it("shows each product's brand, name, and price in id order", async () => {
    renderList();
    const [sephora] = await purchases();
    const items = itemsOf(sephora);
    expect(items[0]).toHaveTextContent(/Milk Makeup.*Hydro Grip Primer.*\$32\.00/);
    expect(items[1]).toHaveTextContent(/fwee.*Cushion Glass Original.*\$0\.00/);
  });

  // @spec PURCH-LIST-010
  it("says there are no purchases yet when no product has one", async () => {
    renderList([product(6, "jane iredale", "Lash Fixation Mascara")]);
    expect(await purchases()).toHaveLength(0);
    expect(screen.getByText("No purchases yet.")).toBeInTheDocument();
  });

  // @spec PURCH-LIST-010
  it("does not say there are no purchases when some exist", async () => {
    renderList();
    await purchases();
    expect(screen.queryByText("No purchases yet.")).toBeNull();
  });
});
