// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLoaderData, useRevalidator } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@/components/ui/toaster";
import type { Product } from "@/features/products/types";
import { renderPage } from "@/test/render";
import { PurchaseList } from "./purchase-list";

type Categories = Record<string, string[]>;
type PageData = { usage: Product[]; categories: Categories };

function product(id: number, brand: string, name: string, category: string, purchase?: Product["purchase"]): Product {
  return {
    id,
    name,
    brand,
    category,
    uses: {},
    currentMonth: "2026-11",
    usesThisMonth: 0,
    ...(purchase ? { purchase } : {}),
  };
}

const categories: Categories = { skincare: ["Cleanser"], makeup: ["Primer", "Foundation"], lips: [] };

const primer = product(0, "Milk Makeup", "Hydro Grip Primer", "Primer");
const cushion = product(1, "fwee", "Cushion Glass Original", "Foundation");
const cleanser = product(2, "Glow Recipe", "Blueberry Bounce Gentle Cleanser", "Cleanser", {
  date: "2026-10-30",
  store: "Ulta",
  price: 1850,
});
const pinch = product(3, "Rare Beauty", "Soft Pinch Liquid Blush", "Foundation");
const toner = product(4, "Krave", "Great Barrier Relief", "Toner");
const gel = product(5, "Anastasia Beverly Hills", "Brow Freeze Gel", "Primer", {
  date: "2026-11-01",
  store: "Sephora",
  price: 2450,
});
const spray = product(6, "Tower 28", "SOS Spray", "Primer", { date: "2026-11-02", store: "Ulta", price: 2800 });

const usage = [primer, cushion, cleanser, pinch, toner, gel, spray];

const label = (record: Product) => `${record.brand} ${record.name}`;

function renderPurchases(loader: () => PageData = vi.fn(() => ({ usage, categories }))) {
  function Page() {
    const data = useLoaderData() as PageData;
    const { revalidate } = useRevalidator();
    return (
      <>
        <button onClick={() => revalidate()}>Refresh</button>
        <PurchaseList usage={data.usage} categories={data.categories} />
      </>
    );
  }
  renderPage(Page, loader);
  return loader;
}

function button(name: string, container: HTMLElement = document.body) {
  return within(container).getByRole("button", { name });
}

async function openPurchaseDialog() {
  fireEvent.click(await screen.findByRole("button", { name: "Add purchase" }));
  const dialog = await screen.findByRole("dialog", { name: "Add purchase" });
  await within(dialog).findByLabelText("Date");
  return dialog;
}

function productSelects() {
  return screen.getAllByLabelText("Product") as HTMLSelectElement[];
}

function priceInputs() {
  return screen.getAllByLabelText("Price") as HTMLInputElement[];
}

function fill(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } });
}

// Native selects can't be driven by text, so find the option's value first.
function chooseProduct(index: number, optionText: string) {
  const select = productSelects()[index];
  const option = within(select).getByRole("option", { name: optionText }) as HTMLOptionElement;
  fireEvent.change(select, { target: { value: option.value } });
}

function optionTexts(select: HTMLSelectElement) {
  return Array.from(select.options)
    .filter((option) => !option.disabled && option.value !== "")
    .map((option) => option.textContent);
}

function selectedText(select: HTMLSelectElement) {
  return select.options[select.selectedIndex]?.textContent;
}

async function fillValidPurchase() {
  const dialog = await openPurchaseDialog();
  chooseProduct(0, label(primer));
  fill(priceInputs()[0], "32");
  return dialog;
}

const fetchMock = vi.fn();

function requestsTo(path: string) {
  return fetchMock.mock.calls.filter(([url]) => String(url).endsWith(path));
}

function bodyOf(call: unknown[]) {
  return JSON.parse((call[1] as RequestInit).body as string);
}

function respond(handlers: Record<string, () => Promise<Response>>) {
  fetchMock.mockImplementation((url: unknown) => {
    const path = Object.keys(handlers).find((key) => String(url).endsWith(key));
    return path ? handlers[path]() : Promise.resolve(new Response("null", { status: 200 }));
  });
}

function errorResponse(message: string, status: number) {
  return () => Promise.resolve(new Response(JSON.stringify({ error: message }), { status }));
}

const never = () => new Promise<Response>(() => {});

async function waitPastOutsideClickSetup() {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 7, 12)); // 7 November 2026, local time
  fetchMock.mockReset();
  respond({});
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  toaster.remove();
});

describe("purchase dialog fields", () => {
  // @spec PURCH-DLG-001
  it("opens when Add purchase is activated", async () => {
    renderPurchases();
    expect(await openPurchaseDialog()).toBeInTheDocument();
  });

  // @spec PURCH-DLG-002
  it("opens with today's date, no store, and one empty item", async () => {
    renderPurchases();
    await openPurchaseDialog();
    expect(screen.getByLabelText("Date")).toHaveValue("2026-11-07");
    expect(screen.getByLabelText("Store")).toHaveValue("");
    expect(productSelects()).toHaveLength(1);
    expect(productSelects()[0].value).toBe("");
    expect(priceInputs()[0]).toHaveValue("");
  });

  // @spec PURCH-DLG-003
  it("offers no date after today", async () => {
    renderPurchases();
    await openPurchaseDialog();
    expect(screen.getByLabelText("Date")).toHaveAttribute("max", "2026-11-07");
  });

  // @spec PURCH-DLG-004
  it("suggests each distinct store already recorded", async () => {
    renderPurchases();
    await openPurchaseDialog();
    const listId = screen.getByLabelText("Store").getAttribute("list");
    expect(listId).toBeTruthy();
    const options = Array.from(document.getElementById(listId!)!.querySelectorAll("option"));
    expect(options.map((option) => option.value).sort()).toEqual(["Sephora", "Ulta"]);
  });

  // @spec PURCH-DLG-005
  it("adds an empty item after the existing ones", async () => {
    renderPurchases();
    await openPurchaseDialog();
    chooseProduct(0, label(primer));
    fill(priceInputs()[0], "32");
    fireEvent.click(button("Add item"));
    expect(productSelects()).toHaveLength(2);
    expect(selectedText(productSelects()[0])).toBe(label(primer));
    expect(priceInputs()[0]).toHaveValue("32");
    expect(productSelects()[1].value).toBe("");
    expect(priceInputs()[1]).toHaveValue("");
  });

  // @spec PURCH-DLG-006
  it("removes an item with its remove control", async () => {
    renderPurchases();
    await openPurchaseDialog();
    chooseProduct(0, label(primer));
    fireEvent.click(button("Add item"));
    chooseProduct(1, label(cushion));
    fireEvent.click(screen.getAllByRole("button", { name: "Remove item" })[0]);
    expect(productSelects()).toHaveLength(1);
    expect(selectedText(productSelects()[0])).toBe(label(cushion));
  });

  // @spec PURCH-DLG-007
  it("disables the remove control while there is one item", async () => {
    renderPurchases();
    await openPurchaseDialog();
    expect(button("Remove item")).toBeDisabled();
    fireEvent.click(button("Add item"));
    for (const remove of screen.getAllByRole("button", { name: "Remove item" })) expect(remove).toBeEnabled();
  });

  // @spec PURCH-DLG-008
  it("offers only products with no purchase that no other item has chosen", async () => {
    renderPurchases();
    await openPurchaseDialog();
    expect(optionTexts(productSelects()[0])).toEqual([label(primer), label(cushion), label(pinch), label(toner), "New product"]);
    chooseProduct(0, label(primer));
    fireEvent.click(button("Add item"));
    expect(optionTexts(productSelects()[0])).toContain(label(primer));
    expect(optionTexts(productSelects()[1])).not.toContain(label(primer));
    expect(optionTexts(productSelects()[1])).not.toContain(label(cleanser));
  });

  // @spec PURCH-DLG-009, PURCH-DLG-010
  it("groups products by category in configured order, with unconfigured categories last under Other", async () => {
    renderPurchases();
    await openPurchaseDialog();
    const groups = Array.from(productSelects()[0].querySelectorAll("optgroup"));
    expect(groups.map((group) => group.label)).toEqual(["Primer", "Foundation", "Other"]);
    expect(within(groups[1] as HTMLElement).getAllByRole("option").map((option) => option.textContent)).toEqual([
      label(cushion),
      label(pinch),
    ]);
    expect(within(groups[2] as HTMLElement).getByRole("option", { name: label(toner) })).toBeInTheDocument();
  });

  // @spec PURCH-DLG-011, PURCH-DLG-012
  it("labels products with brand then name and ends with New product", async () => {
    renderPurchases();
    await openPurchaseDialog();
    const options = optionTexts(productSelects()[0]);
    expect(options).toContain("Milk Makeup Hydro Grip Primer");
    expect(options.at(-1)).toBe("New product");
  });

  // @spec PURCH-DLG-016
  it("marks a price invalid unless it is dollars with at most two decimal places", async () => {
    renderPurchases();
    await openPurchaseDialog();
    const price = priceInputs()[0];
    for (const good of ["32", "32.", "32.5", "32.50", ".99", "$32.50", " 32 ", "0"]) {
      fill(price, good);
      expect(price, good).not.toHaveAttribute("aria-invalid", "true");
    }
    for (const bad of ["abc", "32.505", "-1", "$$3", "3,200", "."]) {
      fill(price, bad);
      expect(price, bad).toHaveAttribute("aria-invalid", "true");
    }
    fill(price, "");
    expect(price).not.toHaveAttribute("aria-invalid", "true");
  });

  // @spec PURCH-DLG-017
  it("shows the total of the valid prices", async () => {
    renderPurchases();
    await openPurchaseDialog();
    expect(screen.getByText("Total $0.00")).toBeInTheDocument();
    fill(priceInputs()[0], "19.99");
    fireEvent.click(button("Add item"));
    fill(priceInputs()[1], "0.29");
    fireEvent.click(button("Add item"));
    fill(priceInputs()[2], "abc");
    expect(screen.getByText("Total $20.28")).toBeInTheDocument();
  });

  // @spec PURCH-DLG-027
  it("keeps its fields when the page's data refreshes while open", async () => {
    const loader = vi
      .fn()
      .mockReturnValueOnce({ usage, categories })
      .mockReturnValue({ usage: [...usage, product(9, "Saie", "Dew Serum", "Cleanser")], categories });
    renderPurchases(loader);
    await openPurchaseDialog();
    fill(screen.getByLabelText("Date"), "2026-11-05");
    fill(screen.getByLabelText("Store"), "Sepho");
    chooseProduct(0, label(cushion));
    fill(priceInputs()[0], "4");
    fireEvent.click(screen.getByText("Refresh"));
    await waitFor(() => expect(optionTexts(productSelects()[0])).toContain("Saie Dew Serum"));
    expect(screen.getByLabelText("Date")).toHaveValue("2026-11-05");
    expect(screen.getByLabelText("Store")).toHaveValue("Sepho");
    expect(selectedText(productSelects()[0])).toBe(label(cushion));
    expect(priceInputs()[0]).toHaveValue("4");
  });
});

describe("creating a product from an item", () => {
  const dewSerum = product(9, "Saie", "Dew Serum", "Cleanser");

  async function openProductDialog() {
    chooseProduct(0, "New product");
    const productDialog = await screen.findByRole("dialog", { name: "Add product" });
    await within(productDialog).findByLabelText("Name");
    return productDialog;
  }

  // @spec PURCH-DLG-013
  it("opens the product dialog over the purchase dialog", async () => {
    renderPurchases();
    await openPurchaseDialog();
    await openProductDialog();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
  });

  // @spec PURCH-DLG-014
  it("chooses the new product on that item once it is saved", async () => {
    respond({ "/api/products": () => Promise.resolve(Response.json({ id: 9 })) });
    const loader = vi
      .fn()
      .mockReturnValueOnce({ usage, categories })
      .mockReturnValue({ usage: [...usage, dewSerum], categories });
    renderPurchases(loader);
    await openPurchaseDialog();
    fireEvent.click(button("Add item"));
    const productDialog = await openProductDialog();
    fill(within(productDialog).getByLabelText("Name"), "Dew Serum");
    fill(within(productDialog).getByLabelText("Brand"), "Saie");
    const category = within(productDialog).getByLabelText("Category") as HTMLSelectElement;
    fireEvent.change(category, { target: { value: "Cleanser" } });
    fireEvent.click(button("Save", productDialog));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add product" })).toBeNull());
    await waitFor(() => expect(selectedText(productSelects()[0])).toBe("Saie Dew Serum"));
    expect(productSelects()[1].value).toBe("");
  });

  // @spec PURCH-DLG-015
  it("keeps the item's earlier product when the product dialog closes without saving", async () => {
    renderPurchases();
    await openPurchaseDialog();
    chooseProduct(0, label(cushion));
    const productDialog = await openProductDialog();
    fireEvent.click(button("Cancel", productDialog));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add product" })).toBeNull());
    expect(selectedText(productSelects()[0])).toBe(label(cushion));
  });

  // @spec PURCH-DLG-015
  it("leaves the item with no product when it had none and the product dialog is cancelled", async () => {
    renderPurchases();
    await openPurchaseDialog();
    const productDialog = await openProductDialog();
    fireEvent.click(button("Cancel", productDialog));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add product" })).toBeNull());
    expect(productSelects()[0].value).toBe("");
  });

  // @spec PURCH-DLG-026
  it("closes only the product dialog on Esc", async () => {
    renderPurchases();
    await openPurchaseDialog();
    const productDialog = await openProductDialog();
    fireEvent.keyDown(within(productDialog).getByLabelText("Name"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add product" })).toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByRole("dialog", { name: "Add purchase" })).toBeInTheDocument();
  });
});

describe("when Save is disabled", () => {
  // @spec PURCH-DLG-018
  it("disables Save while any item has no product", async () => {
    renderPurchases();
    await fillValidPurchase();
    expect(button("Save")).toBeEnabled();
    fireEvent.click(button("Add item"));
    fill(priceInputs()[1], "5");
    expect(button("Save")).toBeDisabled();
  });

  // @spec PURCH-DLG-019
  it("disables Save while any price is blank or invalid", async () => {
    renderPurchases();
    await fillValidPurchase();
    fill(priceInputs()[0], "");
    expect(button("Save")).toBeDisabled();
    fill(priceInputs()[0], "3.333");
    expect(button("Save")).toBeDisabled();
    fill(priceInputs()[0], "3.33");
    expect(button("Save")).toBeEnabled();
  });

  // @spec PURCH-DLG-020
  it("disables Save while the date is empty or after today", async () => {
    renderPurchases();
    await fillValidPurchase();
    fill(screen.getByLabelText("Date"), "");
    expect(button("Save")).toBeDisabled();
    fill(screen.getByLabelText("Date"), "2026-11-08");
    expect(button("Save")).toBeDisabled();
    fill(screen.getByLabelText("Date"), "2026-11-07");
    expect(button("Save")).toBeEnabled();
  });

  // @spec PURCH-DLG-021
  it("disables Save while a save is in flight, so a double click sends one request", async () => {
    respond({ "/api/purchases": never });
    renderPurchases();
    await fillValidPurchase();
    fireEvent.click(button("Save"));
    fireEvent.click(button("Save"));
    await waitFor(() => expect(button("Save")).toBeDisabled());
    expect(requestsTo("/api/purchases")).toHaveLength(1);
  });
});

describe("closing the purchase dialog", () => {
  async function expectClosedWithoutRequest() {
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  }

  // @spec PURCH-DLG-022
  it("closes on Cancel without sending a request", async () => {
    renderPurchases();
    await fillValidPurchase();
    fireEvent.click(button("Cancel"));
    await expectClosedWithoutRequest();
  });

  // @spec PURCH-DLG-023
  it("closes on Esc without sending a request", async () => {
    renderPurchases();
    await fillValidPurchase();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await expectClosedWithoutRequest();
  });

  // @spec PURCH-DLG-023
  it("closes on the close control without sending a request", async () => {
    renderPurchases();
    await fillValidPurchase();
    fireEvent.click(button("Close"));
    await expectClosedWithoutRequest();
  });

  // @spec PURCH-DLG-024
  it("stays open when the user clicks outside it", async () => {
    renderPurchases();
    await fillValidPurchase();
    // Outside-click detection attaches just after opening, and jsdom gives the dialog no size,
    // so a click needs a delay and coordinates away from (0, 0) to count as outside.
    await waitPastOutsideClickSetup();
    const outside = { clientX: 500, clientY: 500 };
    fireEvent.pointerDown(document.body, outside);
    fireEvent.pointerUp(document.body, outside);
    fireEvent.click(document.body, outside);
    await waitPastOutsideClickSetup();
    expect(screen.getByRole("dialog", { name: "Add purchase" })).toBeInTheDocument();
    expect(priceInputs()[0]).toHaveValue("32");
  });

  // @spec PURCH-DLG-025
  it("ignores Cancel, Esc, and the close control while a save is in flight", async () => {
    respond({ "/api/purchases": never });
    renderPurchases();
    await fillValidPurchase();
    fireEvent.click(button("Save"));
    await waitFor(() => expect(button("Save")).toBeDisabled());

    fireEvent.click(button("Cancel"));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    fireEvent.click(button("Close"));
    await waitPastOutsideClickSetup();
    expect(screen.getByRole("dialog", { name: "Add purchase" })).toBeInTheDocument();
  });
});

describe("saving a purchase", () => {
  // @spec PURCH-SAVE-001
  it("POSTs the date and each item's product id and price in whole cents, in order", async () => {
    renderPurchases();
    await openPurchaseDialog();
    fill(screen.getByLabelText("Date"), "2026-11-05");
    chooseProduct(0, label(cushion));
    fill(priceInputs()[0], "$19.99");
    fireEvent.click(button("Add item"));
    chooseProduct(1, label(primer));
    fill(priceInputs()[1], " 0.29 ");
    fireEvent.click(button("Add item"));
    chooseProduct(2, label(pinch));
    fill(priceInputs()[2], "32.");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/purchases")).toHaveLength(1));
    const call = requestsTo("/api/purchases")[0];
    expect((call[1] as RequestInit).method?.toUpperCase()).toBe("POST");
    expect(bodyOf(call)).toEqual({
      date: "2026-11-05",
      items: [
        { productId: 1, price: 1999 },
        { productId: 0, price: 29 },
        { productId: 3, price: 3200 },
      ],
    });
  });

  // @spec PURCH-SAVE-002
  it("includes the trimmed store", async () => {
    renderPurchases();
    await fillValidPurchase();
    fill(screen.getByLabelText("Store"), "  Sephora ");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/purchases")).toHaveLength(1));
    expect(bodyOf(requestsTo("/api/purchases")[0]).store).toBe("Sephora");
  });

  // @spec PURCH-SAVE-003
  it("omits a blank store", async () => {
    renderPurchases();
    await fillValidPurchase();
    fill(screen.getByLabelText("Store"), "   ");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/purchases")).toHaveLength(1));
    expect(bodyOf(requestsTo("/api/purchases")[0])).not.toHaveProperty("store");
  });

  // @spec PURCH-SAVE-004
  it("closes the dialog after a successful save", async () => {
    renderPurchases();
    await fillValidPurchase();
    fireEvent.click(button("Save"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  // @spec PURCH-SAVE-005
  it("reloads the page data after a successful save", async () => {
    const loader = renderPurchases();
    await fillValidPurchase();
    expect(loader).toHaveBeenCalledTimes(1);
    fireEvent.click(button("Save"));
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  });
});

describe("when a purchase save fails", () => {
  // @spec PURCH-SAVE-006
  it("keeps the dialog open with its contents", async () => {
    respond({ "/api/purchases": errorResponse("Nope", 400) });
    renderPurchases();
    await fillValidPurchase();
    fill(screen.getByLabelText("Store"), "Sephora");
    fireEvent.click(button("Save"));
    await screen.findByText("Nope");
    expect(screen.getByRole("dialog", { name: "Add purchase" })).toBeInTheDocument();
    expect(screen.getByLabelText("Store")).toHaveValue("Sephora");
    expect(selectedText(productSelects()[0])).toBe(label(primer));
    expect(priceInputs()[0]).toHaveValue("32");
    expect(button("Save")).toBeEnabled();
  });

  // @spec PURCH-SAVE-007
  it("shows the server's message for an error status", async () => {
    respond({ "/api/purchases": errorResponse("Product 0 already has a purchase", 400) });
    renderPurchases();
    await fillValidPurchase();
    fireEvent.click(button("Save"));
    expect(await screen.findByText("Product 0 already has a purchase")).toBeInTheDocument();
  });

  // @spec PURCH-SAVE-008
  it("says the change was not saved for an error status with no message", async () => {
    respond({ "/api/purchases": () => Promise.resolve(new Response("oops", { status: 500 })) });
    renderPurchases();
    await fillValidPurchase();
    fireEvent.click(button("Save"));
    expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
  });

  // @spec PURCH-SAVE-009
  it("says the change was not saved when there is no response", async () => {
    respond({ "/api/purchases": () => Promise.reject(new TypeError("Failed to fetch")) });
    renderPurchases();
    await fillValidPurchase();
    fireEvent.click(button("Save"));
    expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Add purchase" })).toBeInTheDocument();
  });
});
