// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@/components/ui/toaster";
import { sampleConfigs, sampleUsage } from "@/test/data-dir";
import { renderPage } from "@/test/render";
import { ProductDialog } from "./product-dialog";

type Categories = Record<string, string[]>;

const primer = sampleUsage[0];

function renderDialog({
  product,
  categories = sampleConfigs.categories,
  loader = vi.fn(() => ({ categories })),
}: {
  product?: typeof primer;
  categories?: Categories;
  loader?: () => { categories?: Categories };
} = {}) {
  function Page() {
    const { categories: loaded } = useLoaderData() as { categories?: Categories };
    const { revalidate } = useRevalidator();
    const [open, setOpen] = useState(true);
    return (
      <>
        <button onClick={() => revalidate()}>Refresh</button>
        <ProductDialog open={open} product={product} categories={loaded} onClose={() => setOpen(false)} />
      </>
    );
  }
  renderPage(Page, loader);
  return loader;
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

// Native selects can't be driven by text, so find the option's value first.
function choose(label: string, optionText: string) {
  const select = screen.getByLabelText(label) as HTMLSelectElement;
  const option = within(select).getByRole("option", { name: optionText }) as HTMLOptionElement;
  fireEvent.change(select, { target: { value: option.value } });
}

function optionTexts(label: string) {
  return Array.from((screen.getByLabelText(label) as HTMLSelectElement).options)
    .filter((option) => !option.disabled && option.value !== "")
    .map((option) => option.textContent);
}

function selectedText(label: string) {
  const select = screen.getByLabelText(label) as HTMLSelectElement;
  return select.options[select.selectedIndex]?.textContent;
}

function button(name: string) {
  return screen.getByRole("button", { name });
}

async function dialogReady() {
  await screen.findByRole("dialog");
  await screen.findByLabelText("Name");
}

async function fillProduct(name = "Dew Serum", brand = "Saie") {
  await dialogReady();
  fill("Name", name);
  fill("Brand", brand);
}

async function fillValidNewProduct() {
  await fillProduct();
  choose("Category", "Cleanser");
}

async function fillNewCategory(categoryName: string, group: string) {
  await fillProduct();
  choose("Category", "New category");
  fill("New category name", categoryName);
  choose("Group", group);
}

function requestsTo(path: string) {
  return fetchMock.mock.calls.filter(([url]) => String(url).endsWith(path));
}

function bodyOf(call: unknown[]) {
  return JSON.parse((call[1] as RequestInit).body as string);
}

function respond({ configs, products }: { configs?: () => Promise<Response>; products?: () => Promise<Response> }) {
  fetchMock.mockImplementation((url: unknown) => {
    const handler = String(url).endsWith("/api/configs") ? configs : products;
    return handler ? handler() : Promise.resolve(new Response("null", { status: 200 }));
  });
}

function errorResponse(message: string, status: number) {
  return () => Promise.resolve(new Response(JSON.stringify({ error: message }), { status }));
}

const never = () => new Promise<Response>(() => {});

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  respond({});
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  toaster.remove();
});

describe("product dialog fields", () => {
  // @spec PROD-EDIT-001
  it("opens empty when adding a product", async () => {
    renderDialog();
    await dialogReady();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Brand")).toHaveValue("");
    expect((screen.getByLabelText("Category") as HTMLSelectElement).value).toBe("");
  });

  // @spec PROD-EDIT-002
  it("shows the product's name, brand, and category when editing", async () => {
    renderDialog({ product: primer });
    await dialogReady();
    expect(screen.getByLabelText("Name")).toHaveValue(primer.name);
    expect(screen.getByLabelText("Brand")).toHaveValue(primer.brand);
    expect(selectedText("Category")).toBe(primer.category);
  });

  // @spec PROD-EDIT-003
  it("is modal, hiding the rest of the page from interaction", async () => {
    renderDialog();
    await dialogReady();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull());
  });

  // @spec PROD-EDIT-004
  it("lists categories under their groups in configured order, then New category", async () => {
    renderDialog({ categories: { makeup: ["Primer", "Foundation"], skincare: ["Cleanser"] } });
    await dialogReady();
    expect(optionTexts("Category")).toEqual(["Primer", "Foundation", "Cleanser", "New category"]);
    const groups = (screen.getByLabelText("Category") as HTMLSelectElement).querySelectorAll("optgroup");
    expect(Array.from(groups).map((group) => group.label)).toEqual(["makeup", "skincare"]);
    expect(within(groups[1] as HTMLElement).getByRole("option", { name: "Cleanser" })).toBeInTheDocument();
  });

  // @spec PROD-EDIT-004, PROD-EDIT-005
  it("offers only New category and New group when no categories are configured", async () => {
    renderDialog({ loader: () => ({}) });
    await dialogReady();
    expect(optionTexts("Category")).toEqual(["New category"]);
    choose("Category", "New category");
    expect(optionTexts("Group")).toEqual(["New group"]);
  });

  // @spec PROD-EDIT-005
  it("shows a category name input and group dropdown only after choosing New category", async () => {
    renderDialog();
    await dialogReady();
    expect(screen.queryByLabelText("New category name")).toBeNull();
    expect(screen.queryByLabelText("Group")).toBeNull();
    choose("Category", "New category");
    expect(screen.getByLabelText("New category name")).toBeInTheDocument();
    expect(optionTexts("Group")).toEqual(["skincare", "makeup", "lips", "New group"]);
  });

  // @spec PROD-EDIT-006
  it("shows a group name input only after choosing New group", async () => {
    renderDialog();
    await dialogReady();
    choose("Category", "New category");
    expect(screen.queryByLabelText("New group name")).toBeNull();
    choose("Group", "New group");
    expect(screen.getByLabelText("New group name")).toBeInTheDocument();
  });

  // @spec PROD-EDIT-012
  it("shows the group of an existing category typed as new, ignoring capitalization", async () => {
    renderDialog();
    await fillProduct();
    choose("Category", "New category");
    fill("New category name", "cleanser");
    expect(selectedText("Group")).toBe("skincare");
  });

  // @spec PROD-EDIT-012
  it("returns to the user's own group choice when the typed name stops matching", async () => {
    renderDialog();
    await fillNewCategory("cleanser", "makeup");
    expect(selectedText("Group")).toBe("skincare");
    fill("New category name", "Toner");
    expect(selectedText("Group")).toBe("makeup");
  });

  // @spec PROD-EDIT-013
  it("disables the group dropdown only while the typed name matches an existing category", async () => {
    renderDialog();
    await fillProduct();
    choose("Category", "New category");
    fill("New category name", "CLEANSER");
    expect(screen.getByLabelText("Group")).toBeDisabled();
    fill("New category name", "Toner");
    expect(screen.getByLabelText("Group")).toBeEnabled();
  });

  // @spec PROD-EDIT-014
  it("hides the group name input while the typed name matches an existing category", async () => {
    renderDialog();
    await fillNewCategory("Toner", "New group");
    expect(screen.getByLabelText("New group name")).toBeInTheDocument();
    fill("New category name", "Cleanser");
    expect(screen.queryByLabelText("New group name")).toBeNull();
    expect(button("Save")).toBeEnabled();
  });

  // @spec PROD-EDIT-018
  it("keeps the fields' contents when the page's data refreshes while open", async () => {
    const loader = vi
      .fn()
      .mockReturnValueOnce({ categories: sampleConfigs.categories })
      .mockReturnValue({ categories: { ...sampleConfigs.categories, hair: ["Oil"] } });
    renderDialog({ product: primer, loader });
    await dialogReady();
    fill("Name", "Half typed");
    fill("Brand", "Half brand");
    choose("Category", "Foundation");
    fireEvent.click(screen.getByText("Refresh"));
    await waitFor(() => expect(optionTexts("Category")).toContain("Oil"));
    expect(screen.getByLabelText("Name")).toHaveValue("Half typed");
    expect(screen.getByLabelText("Brand")).toHaveValue("Half brand");
    expect(selectedText("Category")).toBe("Foundation");
  });
});

describe("when Save is disabled", () => {
  // @spec PROD-EDIT-007
  it("disables Save while the name or brand is blank after trimming", async () => {
    renderDialog();
    await fillValidNewProduct();
    expect(button("Save")).toBeEnabled();
    fill("Name", "   ");
    expect(button("Save")).toBeDisabled();
    fill("Name", "Dew Serum");
    fill("Brand", "");
    expect(button("Save")).toBeDisabled();
  });

  // @spec PROD-EDIT-007
  it("disables Save while a shown category name or group name is blank", async () => {
    renderDialog();
    await fillNewCategory("Toner", "New group");
    expect(button("Save")).toBeDisabled();
    fill("New group name", "  ");
    expect(button("Save")).toBeDisabled();
    fill("New group name", "hair");
    expect(button("Save")).toBeEnabled();
    fill("New category name", " ");
    expect(button("Save")).toBeDisabled();
  });

  // @spec PROD-EDIT-008
  it("disables Save while no category is chosen", async () => {
    renderDialog();
    await fillProduct();
    expect(button("Save")).toBeDisabled();
  });

  // @spec PROD-EDIT-008
  it("disables Save while a new category has no group chosen", async () => {
    renderDialog();
    await fillProduct();
    choose("Category", "New category");
    fill("New category name", "Toner");
    expect(button("Save")).toBeDisabled();
    choose("Group", "skincare");
    expect(button("Save")).toBeEnabled();
  });

  // @spec PROD-EDIT-009
  it("disables Save while a save is in flight, so a double click sends one request", async () => {
    respond({ products: never });
    renderDialog();
    await fillValidNewProduct();
    fireEvent.click(button("Save"));
    await waitFor(() => expect(button("Save")).toBeDisabled());
    fireEvent.click(button("Save"));
    expect(requestsTo("/api/products")).toHaveLength(1);
  });

  // @spec PROD-SAVE-006
  it("keeps Save enabled when nothing has changed on an existing product", async () => {
    renderDialog({ product: primer });
    await dialogReady();
    expect(button("Save")).toBeEnabled();
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/products")).toHaveLength(1));
  });
});

describe("closing the dialog", () => {
  async function expectClosedWithoutRequest() {
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  }

  // @spec PROD-EDIT-010
  it("closes on Cancel without sending a request", async () => {
    renderDialog();
    await fillValidNewProduct();
    fireEvent.click(button("Cancel"));
    await expectClosedWithoutRequest();
  });

  // @spec PROD-EDIT-015
  it("closes on Esc without sending a request", async () => {
    renderDialog();
    await fillValidNewProduct();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await expectClosedWithoutRequest();
  });

  // @spec PROD-EDIT-015
  it("closes on the close control without sending a request", async () => {
    renderDialog();
    await fillValidNewProduct();
    fireEvent.click(button("Close"));
    await expectClosedWithoutRequest();
  });

  // @spec PROD-EDIT-016
  it("stays open when the user clicks outside it", async () => {
    renderDialog();
    await fillValidNewProduct();
    // Outside-click detection attaches just after opening, and jsdom gives the dialog no size,
    // so a click needs a delay and coordinates away from (0, 0) to count as outside.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const outside = { clientX: 500, clientY: 500 };
    fireEvent.pointerDown(document.body, outside);
    fireEvent.pointerUp(document.body, outside);
    fireEvent.click(document.body, outside);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Dew Serum");
  });

  // @spec PROD-EDIT-017
  it("ignores Cancel, Esc, and the close control while a save is in flight", async () => {
    respond({ products: never });
    renderDialog();
    await fillValidNewProduct();
    fireEvent.click(button("Save"));
    await waitFor(() => expect(button("Save")).toBeDisabled());

    fireEvent.click(button("Cancel"));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    fireEvent.click(button("Close"));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("saving a product", () => {
  // @spec PROD-EDIT-011
  it("trims text fields before using them", async () => {
    renderDialog();
    await fillNewCategory("  Toner ", "New group");
    fill("New group name", "  hair ");
    fill("Name", "  Dew Serum ");
    fill("Brand", " Saie  ");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/products")).toHaveLength(1));
    expect(bodyOf(requestsTo("/api/configs")[0]).categories.hair).toEqual(["Toner"]);
    expect(bodyOf(requestsTo("/api/products")[0])).toEqual({ name: "Dew Serum", brand: "Saie", category: "Toner" });
  });

  // @spec PROD-SAVE-001
  it("saves a new category at the end of its group before the product", async () => {
    renderDialog();
    await fillNewCategory("Toner", "skincare");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/products")).toHaveLength(1));

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/configs$/);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method?.toUpperCase()).toBe("POST");
    expect(bodyOf(fetchMock.mock.calls[0])).toEqual({
      categories: { ...sampleConfigs.categories, skincare: ["Cleanser", "Toner"] },
    });
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/api\/products$/);
  });

  // @spec PROD-SAVE-001
  it("waits for the category request to finish before sending the product", async () => {
    let finish = (_: Response) => {};
    respond({ configs: () => new Promise<Response>((resolve) => (finish = resolve)) });
    renderDialog();
    await fillNewCategory("Toner", "skincare");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/configs")).toHaveLength(1));
    expect(requestsTo("/api/products")).toHaveLength(0);
    finish(new Response("null", { status: 200 }));
    await waitFor(() => expect(requestsTo("/api/products")).toHaveLength(1));
  });

  // @spec PROD-SAVE-002
  it("places a new group after the existing groups", async () => {
    renderDialog();
    await fillNewCategory("Oil", "New group");
    fill("New group name", "hair");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/products")).toHaveLength(1));
    const { categories } = bodyOf(requestsTo("/api/configs")[0]);
    expect(Object.keys(categories)).toEqual(["skincare", "makeup", "lips", "hair"]);
    expect(categories.hair).toEqual(["Oil"]);
  });

  // @spec PROD-SAVE-002
  it("creates the first group and category when none are configured", async () => {
    renderDialog({ loader: () => ({}) });
    await fillNewCategory("Oil", "New group");
    fill("New group name", "hair");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/products")).toHaveLength(1));
    expect(bodyOf(requestsTo("/api/configs")[0])).toEqual({ categories: { hair: ["Oil"] } });
  });

  // @spec PROD-SAVE-003
  it("adds to an existing group when the typed group name differs only by capitalization", async () => {
    renderDialog();
    await fillNewCategory("Toner", "New group");
    fill("New group name", "SKINCARE");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/products")).toHaveLength(1));
    const { categories } = bodyOf(requestsTo("/api/configs")[0]);
    expect(Object.keys(categories)).toEqual(["skincare", "makeup", "lips"]);
    expect(categories.skincare).toEqual(["Cleanser", "Toner"]);
  });

  // @spec PROD-SAVE-004
  it("uses the configured spelling and sends no category request for an existing category typed as new", async () => {
    renderDialog();
    await fillProduct();
    choose("Category", "New category");
    fill("New category name", "cLEANSER");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/products")).toHaveLength(1));
    expect(requestsTo("/api/configs")).toHaveLength(0);
    expect(bodyOf(requestsTo("/api/products")[0]).category).toBe("Cleanser");
  });

  // @spec PROD-SAVE-005
  it("POSTs a new product's name, brand, and category", async () => {
    renderDialog();
    await fillValidNewProduct();
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/products")).toHaveLength(1));
    const call = requestsTo("/api/products")[0];
    expect((call[1] as RequestInit).method?.toUpperCase()).toBe("POST");
    expect(bodyOf(call)).toEqual({ name: "Dew Serum", brand: "Saie", category: "Cleanser" });
    expect(requestsTo("/api/configs")).toHaveLength(0);
  });

  // @spec PROD-SAVE-006
  it("PUTs an existing product's id, name, brand, and category", async () => {
    renderDialog({ product: primer });
    await dialogReady();
    fill("Name", "Renamed");
    choose("Category", "Foundation");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/products")).toHaveLength(1));
    const call = requestsTo("/api/products")[0];
    expect((call[1] as RequestInit).method?.toUpperCase()).toBe("PUT");
    expect(bodyOf(call)).toEqual({ id: primer.id, name: "Renamed", brand: primer.brand, category: "Foundation" });
  });

  // @spec PROD-SAVE-001, PROD-SAVE-006
  it("can create a new category while editing a product", async () => {
    renderDialog({ product: primer });
    await dialogReady();
    choose("Category", "New category");
    fill("New category name", "Base");
    choose("Group", "makeup");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/products")).toHaveLength(1));
    expect(bodyOf(requestsTo("/api/configs")[0]).categories.makeup).toEqual(["Primer", "Foundation", "Base"]);
    expect(bodyOf(requestsTo("/api/products")[0]).category).toBe("Base");
  });

  // @spec PROD-SAVE-007
  it("sends no product request when the category request fails", async () => {
    respond({ configs: errorResponse("Category is invalid", 400) });
    renderDialog();
    await fillNewCategory("Toner", "skincare");
    fireEvent.click(button("Save"));
    await screen.findByText("Category is invalid");
    expect(requestsTo("/api/products")).toHaveLength(0);
  });

  // @spec PROD-SAVE-008
  it("closes the dialog after a successful save", async () => {
    renderDialog();
    await fillValidNewProduct();
    fireEvent.click(button("Save"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  // @spec PROD-SAVE-009
  it("reloads the page data after a successful save", async () => {
    const loader = renderDialog();
    await fillValidNewProduct();
    expect(loader).toHaveBeenCalledTimes(1);
    fireEvent.click(button("Save"));
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  });
});

describe("when a save fails", () => {
  // @spec PROD-SAVE-010
  it("keeps the dialog open with its contents", async () => {
    respond({ products: errorResponse("Nope", 400) });
    renderDialog();
    await fillValidNewProduct();
    fireEvent.click(button("Save"));
    await screen.findByText("Nope");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Dew Serum");
    expect(selectedText("Category")).toBe("Cleanser");
    expect(button("Save")).toBeEnabled();
  });

  // @spec PROD-SAVE-011
  it("shows the server's message for an error status", async () => {
    respond({ products: errorResponse("Your change could not be saved.", 500) });
    renderDialog();
    await fillValidNewProduct();
    fireEvent.click(button("Save"));
    expect(await screen.findByText("Your change could not be saved.")).toBeInTheDocument();
  });

  // @spec PROD-SAVE-012
  it("says the change was not saved when there is no response", async () => {
    respond({ products: () => Promise.reject(new TypeError("Failed to fetch")) });
    renderDialog();
    await fillValidNewProduct();
    fireEvent.click(button("Save"));
    expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // @spec PROD-SAVE-013
  it("reloads the page data when the category saved but the product did not", async () => {
    respond({ products: errorResponse("Nope", 500) });
    const loader = renderDialog();
    await fillNewCategory("Toner", "skincare");
    fireEvent.click(button("Save"));
    await screen.findByText("Nope");
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // @spec PROD-SAVE-013, PROD-SAVE-004
  it("doesn't resend the category when retrying after the product failed", async () => {
    let attempts = 0;
    respond({
      products: () =>
        Promise.resolve(
          ++attempts === 1
            ? new Response(JSON.stringify({ error: "Nope" }), { status: 500 })
            : new Response("null", { status: 200 }),
        ),
    });
    const loader = vi
      .fn()
      .mockReturnValueOnce({ categories: sampleConfigs.categories })
      .mockReturnValue({ categories: { ...sampleConfigs.categories, skincare: ["Cleanser", "Toner"] } });
    renderDialog({ loader });
    await fillNewCategory("Toner", "skincare");
    fireEvent.click(button("Save"));
    await screen.findByText("Nope");
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    // The group locks once the refreshed categories, which now include Toner, reach the form.
    await waitFor(() => expect(screen.getByLabelText("Group")).toBeDisabled());
    await waitFor(() => expect(button("Save")).toBeEnabled());
    fireEvent.click(button("Save"));
    await waitFor(() => expect(requestsTo("/api/products")).toHaveLength(2));
    expect(requestsTo("/api/configs")).toHaveLength(1);
  });

  // @spec PROD-SAVE-014
  it.each(["<html>Server error</html>", "{}", '{"error":""}', '{"error":3}'])(
    "says the change was not saved when the error body is %s",
    async (body) => {
      respond({ products: () => Promise.resolve(new Response(body, { status: 500 })) });
      renderDialog();
      await fillValidNewProduct();
      fireEvent.click(button("Save"));
      expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
    },
  );
});
