// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLoaderData } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@/components/ui/toaster";
import type { Product } from "@/features/products/types";
import type { Categories } from "@/features/products/use-product-editor";
import { renderPage } from "@/test/render";
import { RoutineEditor, type Routines } from "./routine-editor";

function product(id: number, name: string, category: string, extra: Partial<Product> = {}): Product {
  return { id, name, brand: "Brand", category, uses: {}, currentMonth: "2026-11", usesThisMonth: 0, ...extra };
}

// Configured order (Cleanser, Primer, Foundation, Gloss) differs from usage.json order.
// Products 3 and 2 are two bottles of the same cleanser; only 3 has a purchase, and 3 comes first in usage.json.
// "toner" and "balm" are not configured; "toner" appears first in usage.json.
const usage: Product[] = [
  product(0, "Hydro Grip Primer", "Primer"),
  product(1, "Cushion Glass", "Foundation", { shade: "21N" }),
  product(3, "Gentle Cleanser", "Cleanser", { purchase: { date: "2026-11-07", price: 1800 } }),
  product(2, "Gentle Cleanser", "Cleanser"),
  product(4, "Lip Glow", "Gloss", { shade: "Berry", purchase: { date: "2026-10-01", price: 2400 } }),
  product(5, "Toner Pads", "toner"),
  product(6, "Old Balm", "balm"),
];

const categories: Categories = {
  skincare: ["Cleanser"],
  makeup: ["Primer", "Foundation"],
  lips: ["Gloss"],
  empty: [],
};

const routines: Routines = {
  "Morning Skincare": [2, 1],
  Makeup: [0, 1, 4],
  Evening: [3],
};

type PageData = { routines?: Routines; categories?: Categories; usage: Product[] };

function renderEditor(data: PageData = { routines, categories, usage }) {
  const loader = vi.fn(() => data);
  function Page() {
    const loaded = useLoaderData() as PageData;
    return <RoutineEditor routines={loaded.routines} categories={loaded.categories} usage={loaded.usage} />;
  }
  renderPage(Page, loader);
  return loader;
}

async function ready() {
  await screen.findByRole("button", { name: "Add routine" });
}

function section(routine: string) {
  return screen.getByRole("region", { name: `Routine ${routine}` });
}

function button(name: string) {
  return screen.getByRole("button", { name });
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function choose(label: string, value: number) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: String(value) } });
}

/** A product dropdown's option groups, with the text of each group's options. */
function optionGroups(label: string) {
  const select = screen.getByLabelText(label);
  return Array.from(select.querySelectorAll("optgroup")).map((group) => ({
    label: group.label,
    options: Array.from(group.querySelectorAll("option")).map((option) => option.textContent),
  }));
}

function listed(routine: string) {
  return within(section(routine))
    .getAllByRole("listitem")
    .map((item) => within(item).getByTestId("routine-product").textContent);
}

function requests() {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    body: JSON.parse((init as RequestInit).body as string),
  }));
}

/** The `routines` value of the one request sent, with its key order kept as entries. */
function sentRoutines() {
  const [request] = requests();
  expect(request.url).toMatch(/\/api\/configs$/);
  return Object.entries(request.body.routines as Routines);
}

function follows(earlier: Element, later: Element) {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

const ok = () => Promise.resolve(new Response("null", { status: 200 }));
const never = () => new Promise<Response>(() => {});
const failWith = (error: string) => () => Promise.resolve(new Response(JSON.stringify({ error }), { status: 400 }));
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(ok);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  toaster.remove();
});

describe("routine editor layout", () => {
  // @spec ROUT-EDIT-001
  it("shows one section per routine in configured order, headed by the routine name", async () => {
    renderEditor();
    await ready();
    const headings = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["Morning Skincare", "Makeup", "Evening"]);
    for (const name of Object.keys(routines)) {
      expect(within(section(name)).getByRole("heading", { name })).toBeInTheDocument();
    }
  });

  // @spec ROUT-EDIT-001
  it("shows routines with integer-like names first, as routine cards do", async () => {
    renderEditor({ routines: { Glow: [0], "2": [1] }, categories, usage });
    await ready();
    const headings = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["2", "Glow"]);
  });

  // @spec ROUT-EDIT-002
  it("lists each routine's products in configured order as a numbered list", async () => {
    renderEditor();
    await ready();
    expect(listed("Makeup")).toEqual(["Hydro Grip Primer", "Cushion Glass – 21N", "Lip Glow – Berry"]);
    expect(within(section("Makeup")).getByRole("list").tagName).toBe("OL");
  });

  // @spec ROUT-EDIT-003
  it("shows each product's name followed by its shade when it has one", async () => {
    renderEditor();
    await ready();
    expect(listed("Morning Skincare")).toEqual(["Gentle Cleanser", "Cushion Glass – 21N"]);
  });

  // @spec ROUT-EDIT-004
  it("shows Unknown product (id N) for an id that matches no product", async () => {
    renderEditor({ routines: { Old: [0, 99] }, categories, usage });
    await ready();
    expect(listed("Old")).toEqual(["Hydro Grip Primer", "Unknown product (id 99)"]);
  });

  // @spec ROUT-EDIT-005
  it("shows Rename, Move up, Move down, and Delete for each routine", async () => {
    renderEditor();
    await ready();
    for (const name of Object.keys(routines)) {
      for (const label of [`Rename routine ${name}`, `Move routine ${name} up`, `Move routine ${name} down`, `Delete routine ${name}`]) {
        expect(button(label)).toBeInTheDocument();
      }
    }
  });

  // @spec ROUT-EDIT-006
  it("shows Move up, Move down, and Remove for each listed product, including an unknown one", async () => {
    renderEditor({ routines: { Old: [1, 99] }, categories, usage });
    await ready();
    for (const label of ["Cushion Glass – 21N", "Unknown product (id 99)"]) {
      for (const name of [`Move ${label} up in Old`, `Move ${label} down in Old`, `Remove ${label} from Old`]) {
        expect(button(name)).toBeInTheDocument();
      }
    }
  });

  // @spec ROUT-EDIT-007
  it("ends each routine's section with an Add product dropdown", async () => {
    renderEditor();
    await ready();
    for (const name of Object.keys(routines)) {
      const dropdown = within(section(name)).getByLabelText(`Add product to ${name}`);
      const items = within(section(name)).getAllByRole("listitem");
      expect(follows(items[items.length - 1], dropdown)).toBe(true);
    }
  });

  // @spec ROUT-EDIT-008
  it("ends with a new routine name input, a First product dropdown, and Add routine, after every section", async () => {
    renderEditor();
    await ready();
    const name = screen.getByLabelText("New routine name");
    const first = screen.getByLabelText("First product");
    const add = button("Add routine");
    expect(follows(section("Evening"), name)).toBe(true);
    expect(follows(name, first)).toBe(true);
    expect(follows(first, add)).toBe(true);
  });

  // @spec ROUT-EDIT-009
  it.each([["an empty routines object", {}], ["no routines key", undefined]])(
    "shows only the new routine controls with %s",
    async (_label, configured) => {
      renderEditor({ routines: configured, categories, usage });
      await ready();
      expect(screen.queryAllByRole("region")).toHaveLength(0);
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
      expect(screen.getByLabelText("New routine name")).toBeInTheDocument();
      expect(screen.getByLabelText("First product")).toBeInTheDocument();
      expect(screen.getAllByRole("button").map((item) => item.textContent)).toEqual(["Add routine"]);
    },
  );
});

describe("routine editor product dropdowns", () => {
  // @spec ROUT-EDIT-010, ROUT-EDIT-011, ROUT-EDIT-012, ROUT-EDIT-018
  it("groups the First product dropdown by category in configured order, leaving out empty categories", async () => {
    renderEditor();
    await ready();
    const labels = optionGroups("First product").map((group) => group.label);
    expect(labels.slice(0, 4)).toEqual(["Cleanser", "Primer", "Foundation", "Gloss"]);
    expect(optionGroups("First product").flatMap((group) => group.options)).toHaveLength(usage.length);
  });

  // @spec ROUT-EDIT-012, ROUT-EDIT-016
  it("leaves out a category whose products are all already in the routine", async () => {
    renderEditor();
    await ready();
    const labels = optionGroups("Add product to Makeup").map((group) => group.label);
    expect(labels).toEqual(["Cleanser", "toner", "balm"]);
  });

  // @spec ROUT-EDIT-013
  it("orders products within a group by their order in usage.json", async () => {
    renderEditor({ routines: {}, categories, usage: usage.filter((item) => item.id !== 3).concat(usage[2]) });
    await ready();
    const cleanser = optionGroups("First product").find((group) => group.label === "Cleanser");
    expect(cleanser?.options).toEqual(["Gentle Cleanser", "Gentle Cleanser (bought Nov 7, 2026)"]);
  });

  // @spec ROUT-EDIT-014
  it("shows each option as the product's name followed by its shade when it has one", async () => {
    renderEditor();
    await ready();
    const options = Object.fromEntries(optionGroups("First product").map((group) => [group.label, group.options]));
    expect(options.Primer).toEqual(["Hydro Grip Primer"]);
    expect(options.Foundation).toEqual(["Cushion Glass – 21N"]);
  });

  // @spec ROUT-EDIT-015
  it("adds the purchase date only to colliding options whose product has a purchase", async () => {
    renderEditor();
    await ready();
    const options = Object.fromEntries(optionGroups("First product").map((group) => [group.label, group.options]));
    expect(options.Cleanser).toEqual(["Gentle Cleanser (bought Nov 7, 2026)", "Gentle Cleanser"]);
    expect(options.Gloss).toEqual(["Lip Glow – Berry"]);
  });

  // @spec ROUT-EDIT-015, ROUT-EDIT-016
  it("checks for colliding text within one dropdown only", async () => {
    renderEditor();
    await ready();
    const cleanser = optionGroups("Add product to Morning Skincare").find((group) => group.label === "Cleanser");
    expect(cleanser?.options).toEqual(["Gentle Cleanser"]);
  });

  // @spec ROUT-EDIT-016
  it("leaves out products already in the routine", async () => {
    renderEditor();
    await ready();
    const options = optionGroups("Add product to Makeup").flatMap((group) => group.options);
    expect(options).toEqual(["Gentle Cleanser (bought Nov 7, 2026)", "Gentle Cleanser", "Toner Pads", "Old Balm"]);
  });

  // @spec ROUT-EDIT-017
  it("disables Add product while every product is already in the routine", async () => {
    renderEditor({ routines: { All: usage.map((item) => item.id), Some: [0] }, categories, usage });
    await ready();
    expect(screen.getByLabelText("Add product to All")).toBeDisabled();
    expect(screen.getByLabelText("Add product to Some")).toBeEnabled();
  });

  // @spec ROUT-EDIT-053
  it("lists products whose category is not configured under a group named for it, after the configured ones", async () => {
    renderEditor();
    await ready();
    const groups = optionGroups("First product");
    expect(groups.slice(4)).toEqual([
      { label: "toner", options: ["Toner Pads"] },
      { label: "balm", options: ["Old Balm"] },
    ]);
  });

  // @spec ROUT-EDIT-054
  it("orders unconfigured categories by their first appearance in usage.json", async () => {
    const reordered = [usage[6], ...usage.slice(0, 6)];
    renderEditor({ routines: {}, categories, usage: reordered });
    await ready();
    expect(optionGroups("First product").slice(4).map((group) => group.label)).toEqual(["balm", "toner"]);
  });
});

describe("routine editor edits", () => {
  // @spec ROUT-EDIT-019, ROUT-EDIT-029
  it("adds a routine with the trimmed name and first product after the existing routines", async () => {
    renderEditor();
    await ready();
    fill("New routine name", "  Glam  ");
    choose("First product", 4);
    fireEvent.click(button("Add routine"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(Object.keys(requests()[0].body)).toEqual(["routines"]);
    expect(sentRoutines()).toEqual([...Object.entries(routines), ["Glam", [4]]]);
  });

  // @spec ROUT-EDIT-019
  it("adds the first routine when no routines key is configured", async () => {
    renderEditor({ categories, usage });
    await ready();
    fill("New routine name", "Glam");
    choose("First product", 0);
    fireEvent.click(button("Add routine"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentRoutines()).toEqual([["Glam", [0]]]);
  });

  // @spec ROUT-EDIT-020
  it("adds a routine when Enter is pressed in the name input, unless Add routine is disabled", async () => {
    renderEditor();
    await ready();
    fill("New routine name", "Glam");
    fireEvent.keyDown(screen.getByLabelText("New routine name"), { key: "Enter" });
    expect(fetchMock).not.toHaveBeenCalled();

    choose("First product", 4);
    fireEvent.keyDown(screen.getByLabelText("New routine name"), { key: "Enter" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentRoutines()).toEqual([...Object.entries(routines), ["Glam", [4]]]);
  });

  // @spec ROUT-EDIT-021, ROUT-EDIT-029
  it("renames a routine in place, keeping its position and products", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename routine Makeup"));
    fill("New name for routine Makeup", "  Full Face ");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(Object.keys(requests()[0].body)).toEqual(["routines"]);
    expect(sentRoutines()).toEqual([
      ["Morning Skincare", [2, 1]],
      ["Full Face", [0, 1, 4]],
      ["Evening", [3]],
    ]);
  });

  // @spec ROUT-EDIT-022
  it("swaps a routine with its neighbor when moved up or down", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Move routine Makeup up"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentRoutines().map(([name]) => name)).toEqual(["Makeup", "Morning Skincare", "Evening"]);

    fetchMock.mockClear();
    await waitFor(() => expect(button("Move routine Makeup down")).toBeEnabled());
    fireEvent.click(button("Move routine Makeup down"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentRoutines().map(([name]) => name)).toEqual(["Morning Skincare", "Evening", "Makeup"]);
  });

  // @spec ROUT-EDIT-023
  it("deletes a routine", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Delete routine Makeup"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentRoutines()).toEqual([
      ["Morning Skincare", [2, 1]],
      ["Evening", [3]],
    ]);
  });

  // @spec ROUT-EDIT-024, ROUT-EDIT-029
  it("appends the chosen product to the end of the routine", async () => {
    renderEditor();
    await ready();
    choose("Add product to Makeup", 5);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(Object.keys(requests()[0].body)).toEqual(["routines"]);
    expect(sentRoutines()).toEqual([
      ["Morning Skincare", [2, 1]],
      ["Makeup", [0, 1, 4, 5]],
      ["Evening", [3]],
    ]);
  });

  // @spec ROUT-EDIT-025
  it("returns the Add product dropdown to its prompt after a product is chosen", async () => {
    renderEditor();
    await ready();
    choose("Add product to Makeup", 5);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const dropdown = screen.getByLabelText("Add product to Makeup") as HTMLSelectElement;
    expect(dropdown.value).toBe("");
    expect(dropdown.selectedOptions[0].textContent).toBe("Add product…");
  });

  // @spec ROUT-EDIT-026
  it("swaps a product with its neighbor in the same routine when moved up or down", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Move Cushion Glass – 21N up in Makeup"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentRoutines()).toEqual([
      ["Morning Skincare", [2, 1]],
      ["Makeup", [1, 0, 4]],
      ["Evening", [3]],
    ]);

    fetchMock.mockClear();
    await waitFor(() => expect(button("Move Cushion Glass – 21N down in Makeup")).toBeEnabled());
    fireEvent.click(button("Move Cushion Glass – 21N down in Makeup"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentRoutines()).toEqual([
      ["Morning Skincare", [2, 1]],
      ["Makeup", [0, 4, 1]],
      ["Evening", [3]],
    ]);
  });

  // @spec ROUT-EDIT-027
  it("removes a product from a routine that lists more than one", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Remove Cushion Glass – 21N from Makeup"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentRoutines()).toEqual([
      ["Morning Skincare", [2, 1]],
      ["Makeup", [0, 4]],
      ["Evening", [3]],
    ]);
  });

  // @spec ROUT-EDIT-027
  it("removes only the clicked entry when a routine lists a product twice", async () => {
    renderEditor({ routines: { Old: [0, 1, 0] }, categories, usage });
    await ready();
    const [, second] = screen.getAllByRole("button", { name: "Remove Hydro Grip Primer from Old" });
    fireEvent.click(second);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentRoutines()).toEqual([["Old", [0, 1]]]);
  });

  // @spec ROUT-EDIT-028
  it("deletes the routine when its only entry is removed", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Remove Gentle Cleanser from Evening"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentRoutines()).toEqual([
      ["Morning Skincare", [2, 1]],
      ["Makeup", [0, 1, 4]],
    ]);
  });
});

describe("routine editor disabled controls", () => {
  // @spec ROUT-EDIT-030
  it("disables Move up on the first routine and on the first product of each routine", async () => {
    renderEditor();
    await ready();
    expect(button("Move routine Morning Skincare up")).toBeDisabled();
    expect(button("Move routine Makeup up")).toBeEnabled();
    expect(button("Move Hydro Grip Primer up in Makeup")).toBeDisabled();
    expect(button("Move Gentle Cleanser up in Morning Skincare")).toBeDisabled();
    expect(button("Move Cushion Glass – 21N up in Makeup")).toBeEnabled();
  });

  // @spec ROUT-EDIT-031
  it("disables Move down on the last routine and on the last product of each routine", async () => {
    renderEditor();
    await ready();
    expect(button("Move routine Evening down")).toBeDisabled();
    expect(button("Move routine Makeup down")).toBeEnabled();
    expect(button("Move Lip Glow – Berry down in Makeup")).toBeDisabled();
    expect(button("Move Cushion Glass – 21N down in Morning Skincare")).toBeDisabled();
    expect(button("Move Cushion Glass – 21N down in Makeup")).toBeEnabled();
  });

  // @spec ROUT-EDIT-032
  it("disables Add routine while the name is blank", async () => {
    renderEditor();
    await ready();
    choose("First product", 0);
    expect(button("Add routine")).toBeDisabled();
    fill("New routine name", "   ");
    expect(button("Add routine")).toBeDisabled();
    fill("New routine name", "Glam");
    expect(button("Add routine")).toBeEnabled();
  });

  // @spec ROUT-EDIT-033
  it("disables Add routine while the name matches an existing routine ignoring capitalization and spaces", async () => {
    renderEditor();
    await ready();
    choose("First product", 0);
    fill("New routine name", " makeup ");
    expect(button("Add routine")).toBeDisabled();
    fill("New routine name", "Makeup 2");
    expect(button("Add routine")).toBeEnabled();
  });

  // @spec ROUT-EDIT-034
  it("disables Add routine while no first product is chosen", async () => {
    renderEditor();
    await ready();
    fill("New routine name", "Glam");
    expect(button("Add routine")).toBeDisabled();
    choose("First product", 0);
    expect(button("Add routine")).toBeEnabled();
  });
});

describe("routine editor renaming", () => {
  // @spec ROUT-EDIT-035
  it("replaces the name with an input holding it, followed by Save and Cancel", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename routine Makeup"));
    const input = screen.getByLabelText("New name for routine Makeup");
    expect(input).toHaveValue("Makeup");
    expect(within(section("Makeup")).queryByRole("heading", { name: "Makeup" })).toBeNull();
    const save = button("Save");
    const cancel = button("Cancel");
    expect(follows(input, save)).toBe(true);
    expect(follows(save, cancel)).toBe(true);
  });

  // @spec ROUT-EDIT-036
  it("disables Save while the rename input is blank", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename routine Makeup"));
    fill("New name for routine Makeup", "  ");
    expect(button("Save")).toBeDisabled();
  });

  // @spec ROUT-EDIT-037
  it("disables Save while the trimmed name equals the current name, but not for a capitalization change", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename routine Makeup"));
    expect(button("Save")).toBeDisabled();
    fill("New name for routine Makeup", " Makeup ");
    expect(button("Save")).toBeDisabled();
    fill("New name for routine Makeup", "makeup");
    expect(button("Save")).toBeEnabled();
  });

  // @spec ROUT-EDIT-038
  it("disables Save while the name matches another routine ignoring capitalization and spaces", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename routine Makeup"));
    fill("New name for routine Makeup", " evening ");
    expect(button("Save")).toBeDisabled();
  });

  // @spec ROUT-EDIT-039
  it("saves on Enter only while Save is enabled", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename routine Makeup"));
    fireEvent.keyDown(screen.getByLabelText("New name for routine Makeup"), { key: "Enter" });
    expect(fetchMock).not.toHaveBeenCalled();

    fill("New name for routine Makeup", "Glam");
    fireEvent.keyDown(screen.getByLabelText("New name for routine Makeup"), { key: "Enter" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentRoutines().map(([name]) => name)).toEqual(["Morning Skincare", "Glam", "Evening"]);
  });

  // @spec ROUT-EDIT-040
  it("closes the rename input on Cancel or Esc without sending a request", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename routine Makeup"));
    fill("New name for routine Makeup", "Glam");
    fireEvent.click(button("Cancel"));
    expect(screen.queryByLabelText("New name for routine Makeup")).toBeNull();

    fireEvent.click(button("Rename routine Evening"));
    fill("New name for routine Evening", "Night");
    fireEvent.keyDown(screen.getByLabelText("New name for routine Evening"), { key: "Escape" });
    expect(screen.queryByLabelText("New name for routine Evening")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // @spec ROUT-EDIT-041
  it("closes an open rename input without saving when another Rename is activated", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename routine Makeup"));
    fill("New name for routine Makeup", "Glam");
    fireEvent.click(button("Rename routine Evening"));
    expect(screen.queryByLabelText("New name for routine Makeup")).toBeNull();
    expect(screen.getByLabelText("New name for routine Evening")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // @spec ROUT-EDIT-042
  it("keeps the rename input and Cancel enabled while the rename is in flight", async () => {
    fetchMock.mockImplementation(never);
    renderEditor();
    await ready();
    fireEvent.click(button("Rename routine Makeup"));
    fill("New name for routine Makeup", "Glam");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(button("Save")).toBeDisabled());
    expect(screen.getByLabelText("New name for routine Makeup")).toBeEnabled();
    expect(button("Cancel")).toBeEnabled();
  });
});

describe("routine editor saving", () => {
  // @spec ROUT-EDIT-043
  it("disables every edit control while a request is in flight", async () => {
    fetchMock.mockImplementation(never);
    renderEditor();
    await ready();
    fireEvent.click(button("Delete routine Evening"));
    await waitFor(() => expect(button("Rename routine Makeup")).toBeDisabled());
    const controls = screen
      .getAllByRole("button")
      .filter((item) => /^(Rename|Move|Delete|Remove) /.test(item.getAttribute("aria-label") ?? ""));
    for (const control of controls) expect(control).toBeDisabled();
    for (const name of Object.keys(routines)) expect(screen.getByLabelText(`Add product to ${name}`)).toBeDisabled();
    fill("New routine name", "Glam");
    choose("First product", 0);
    expect(button("Add routine")).toBeDisabled();
  });

  // @spec ROUT-EDIT-043
  it("disables a rename's Save while it is in flight", async () => {
    fetchMock.mockImplementation(never);
    renderEditor();
    await ready();
    fireEvent.click(button("Rename routine Makeup"));
    fill("New name for routine Makeup", "Glam");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(button("Save")).toBeDisabled());
  });

  // @spec ROUT-EDIT-044
  it("revalidates the page's loaders after a request, whether it succeeds or fails", async () => {
    const loader = renderEditor();
    await ready();
    const before = loader.mock.calls.length;
    fireEvent.click(button("Delete routine Evening"));
    await waitFor(() => expect(loader.mock.calls.length).toBe(before + 1));

    fetchMock.mockImplementation(failWith("Nope"));
    await waitFor(() => expect(button("Delete routine Evening")).toBeEnabled());
    fireEvent.click(button("Delete routine Evening"));
    await waitFor(() => expect(loader.mock.calls.length).toBe(before + 2));
  });

  // @spec ROUT-EDIT-045, ROUT-EDIT-046
  it("clears the new routine inputs after a successful add", async () => {
    renderEditor();
    await ready();
    fill("New routine name", "Glam");
    choose("First product", 4);
    fireEvent.click(button("Add routine"));
    await waitFor(() => expect(screen.getByLabelText("New routine name")).toHaveValue(""));
    expect((screen.getByLabelText("First product") as HTMLSelectElement).value).toBe("");
  });

  // @spec ROUT-EDIT-047
  it("closes the rename input after a successful rename", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename routine Makeup"));
    fill("New name for routine Makeup", "Glam");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(screen.queryByLabelText("New name for routine Makeup")).toBeNull());
  });

  // @spec ROUT-EDIT-048
  it("keeps the new routine name and first product when an add fails", async () => {
    fetchMock.mockImplementation(failWith("Nope"));
    renderEditor();
    await ready();
    fill("New routine name", "Glam");
    choose("First product", 4);
    fireEvent.click(button("Add routine"));
    await screen.findByText("Nope");
    await waitFor(() => expect(button("Add routine")).toBeEnabled());
    expect(screen.getByLabelText("New routine name")).toHaveValue("Glam");
    expect((screen.getByLabelText("First product") as HTMLSelectElement).value).toBe("4");
  });

  // @spec ROUT-EDIT-049
  it("keeps the rename text when a rename fails", async () => {
    fetchMock.mockImplementation(failWith("Nope"));
    renderEditor();
    await ready();
    fireEvent.click(button("Rename routine Makeup"));
    fill("New name for routine Makeup", "Glam");
    fireEvent.click(button("Save"));
    await screen.findByText("Nope");
    await waitFor(() => expect(button("Save")).toBeEnabled());
    expect(screen.getByLabelText("New name for routine Makeup")).toHaveValue("Glam");
  });

  // @spec ROUT-EDIT-050
  it("shows the server's error message", async () => {
    fetchMock.mockImplementation(failWith('Routine "Old" lists unknown product id 99'));
    renderEditor();
    await ready();
    fireEvent.click(button("Delete routine Evening"));
    expect(await screen.findByText('Routine "Old" lists unknown product id 99')).toBeInTheDocument();
  });

  // @spec ROUT-EDIT-051
  it.each([["no body", ""], ["a body without an error", "{}"], ["an empty error", '{"error":""}']])(
    "says the change was not saved for an error status with %s",
    async (_label, body) => {
      fetchMock.mockImplementation(() => Promise.resolve(new Response(body, { status: 500 })));
      renderEditor();
      await ready();
      fireEvent.click(button("Delete routine Evening"));
      expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
    },
  );

  // @spec ROUT-EDIT-052
  it("says the change was not saved when there is no response", async () => {
    fetchMock.mockImplementation(() => Promise.reject(new TypeError("Failed to fetch")));
    renderEditor();
    await ready();
    fireEvent.click(button("Delete routine Evening"));
    expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
  });
});
