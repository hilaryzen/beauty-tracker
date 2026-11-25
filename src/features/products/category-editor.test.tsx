// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLoaderData } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@/components/ui/toaster";
import { sampleUsage } from "@/test/data-dir";
import { renderPage } from "@/test/render";
import { CategoryEditor } from "./category-editor";
import type { Product } from "./types";
import type { Categories } from "./use-product-editor";

// Primer is used twice, Foundation and Cleanser once each; Toner and Gloss are unused.
const categories: Categories = {
  skincare: ["Cleanser", "Toner"],
  makeup: ["Primer", "Foundation"],
  lips: ["Gloss"],
  empty: [],
};
const usage: Product[] = [...sampleUsage, { ...sampleUsage[0], id: 3 }];

type PageData = { categories?: Categories; usage: Product[] };

function renderEditor(data: PageData = { categories, usage }) {
  const loader = vi.fn(() => data);
  function Page() {
    const loaded = useLoaderData() as PageData;
    return <CategoryEditor categories={loaded.categories} usage={loaded.usage} />;
  }
  renderPage(Page, loader);
  return loader;
}

async function ready() {
  await screen.findByRole("button", { name: "Add group" });
}

function region(group: string) {
  return screen.getByRole("region", { name: group });
}

function button(name: string) {
  return screen.getByRole("button", { name });
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function moveTo(category: string, group: string) {
  fireEvent.change(screen.getByLabelText(`Move category ${category} to`), { target: { value: group } });
}

function requests() {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    body: JSON.parse((init as RequestInit).body as string),
  }));
}

function sentCategories() {
  const [request] = requests();
  expect(request.url).toMatch(/\/api\/configs$/);
  return request.body.categories as Categories;
}

function follows(earlier: Element, later: Element) {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

const ok = () => Promise.resolve(new Response("null", { status: 200 }));
const never = () => new Promise<Response>(() => {});
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

describe("category editor layout", () => {
  // @spec PROD-CATEDIT-001
  it("shows one section per group in configured order, headed by the group name", async () => {
    renderEditor();
    await ready();
    const headings = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["skincare", "makeup", "lips", "empty"]);
    for (const group of Object.keys(categories)) {
      expect(within(region(group)).getByRole("heading", { name: group })).toBeInTheDocument();
    }
  });

  // @spec PROD-CATEDIT-002
  it("lists each group's categories in configured order", async () => {
    renderEditor();
    await ready();
    const names = within(region("makeup")).getAllByRole("listitem").map((item) => within(item).getByTestId("category-name").textContent);
    expect(names).toEqual(["Primer", "Foundation"]);
  });

  // @spec PROD-CATEDIT-003
  it("shows how many products use each category", async () => {
    renderEditor();
    await ready();
    const [primer, foundation] = within(region("makeup")).getAllByRole("listitem");
    expect(primer).toHaveTextContent("2 products");
    expect(foundation).toHaveTextContent("1 product");
    expect(foundation).not.toHaveTextContent("1 products");
    expect(within(region("lips")).getByRole("listitem")).toHaveTextContent("0 products");
  });

  // @spec PROD-CATEDIT-004
  it("shows Rename, Move up, Move down, and Delete for each group", async () => {
    renderEditor();
    await ready();
    for (const group of Object.keys(categories)) {
      for (const label of [`Rename group ${group}`, `Move group ${group} up`, `Move group ${group} down`, `Delete group ${group}`]) {
        expect(button(label)).toBeInTheDocument();
      }
    }
  });

  // @spec PROD-CATEDIT-005
  it("shows Rename, Move up, Move down, Move to, and Delete for each category", async () => {
    renderEditor();
    await ready();
    for (const category of Object.values(categories).flat()) {
      for (const label of [`Rename category ${category}`, `Move category ${category} up`, `Move category ${category} down`, `Delete category ${category}`]) {
        expect(button(label)).toBeInTheDocument();
      }
      expect(screen.getByLabelText(`Move category ${category} to`)).toBeInTheDocument();
    }
  });

  // @spec PROD-CATEDIT-006
  it("lists every other group in a category's Move to dropdown, in configured order", async () => {
    renderEditor();
    await ready();
    const select = screen.getByLabelText("Move category Primer to") as HTMLSelectElement;
    const groups = Array.from(select.options).filter((option) => option.value !== "").map((option) => option.textContent);
    expect(groups).toEqual(["skincare", "lips", "empty"]);
  });

  // @spec PROD-CATEDIT-007
  it("ends each group's section with a new category input and an Add button", async () => {
    renderEditor();
    await ready();
    for (const group of Object.keys(categories)) {
      const section = region(group);
      const input = within(section).getByLabelText(`New category in ${group}`);
      const add = within(section).getByRole("button", { name: `Add category to ${group}` });
      expect(add).toHaveTextContent("Add");
      for (const item of within(section).queryAllByRole("listitem")) expect(follows(item, input)).toBe(true);
      expect(follows(input, add)).toBe(true);
    }
  });

  // @spec PROD-CATEDIT-008
  it("ends with a new group input and an Add group button after every section", async () => {
    renderEditor();
    await ready();
    const input = screen.getByLabelText("New group name");
    expect(follows(region("empty"), input)).toBe(true);
    expect(follows(input, button("Add group"))).toBe(true);
  });

  // @spec PROD-CATEDIT-043
  it("shows only the new group input and Add group when no groups are configured", async () => {
    renderEditor({ categories: undefined, usage });
    await ready();
    // The page's notification area is also a region, so look for group sections by their headings.
    expect(screen.queryAllByRole("heading", { level: 3 })).toEqual([]);
    expect(screen.getByLabelText("New group name")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.getAllByRole("button")).toEqual([button("Add group")]);
  });
});

describe("category editor edits", () => {
  // @spec PROD-CATEDIT-009
  it("adds a trimmed category at the end of its group", async () => {
    renderEditor();
    await ready();
    fill("New category in makeup", "  Blush ");
    fireEvent.click(button("Add category to makeup"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentCategories()).toEqual({ ...categories, makeup: ["Primer", "Foundation", "Blush"] });
  });

  // @spec PROD-CATEDIT-010
  it("adds a trimmed empty group after the existing groups", async () => {
    renderEditor();
    await ready();
    fill("New group name", " hair ");
    fireEvent.click(button("Add group"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const sent = sentCategories();
    expect(sent).toEqual({ ...categories, hair: [] });
    expect(Object.keys(sent)).toEqual(["skincare", "makeup", "lips", "empty", "hair"]);
  });

  // @spec PROD-CATEDIT-011
  it("renames a group in place, keeping its position and categories", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename group makeup"));
    fill("New name for makeup", " face ");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const sent = sentCategories();
    expect(Object.entries(sent)).toEqual([
      ["skincare", ["Cleanser", "Toner"]],
      ["face", ["Primer", "Foundation"]],
      ["lips", ["Gloss"]],
      ["empty", []],
    ]);
  });

  // @spec PROD-CATEDIT-012
  it("swaps a category with its neighbor when moved up or down", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Move category Foundation up"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentCategories().makeup).toEqual(["Foundation", "Primer"]);

    fetchMock.mockClear();
    await waitFor(() => expect(button("Move category Cleanser down")).toBeEnabled());
    fireEvent.click(button("Move category Cleanser down"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentCategories().skincare).toEqual(["Toner", "Cleanser"]);
  });

  // @spec PROD-CATEDIT-013
  it("swaps a group with its neighbor when moved up or down", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Move group lips up"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(Object.keys(sentCategories())).toEqual(["skincare", "lips", "makeup", "empty"]);

    fetchMock.mockClear();
    await waitFor(() => expect(button("Move group skincare down")).toBeEnabled());
    fireEvent.click(button("Move group skincare down"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const sent = sentCategories();
    expect(Object.keys(sent)).toEqual(["makeup", "skincare", "lips", "empty"]);
    expect(sent.skincare).toEqual(categories.skincare);
  });

  // @spec PROD-CATEDIT-014
  it("moves a category to the end of the chosen group", async () => {
    renderEditor();
    await ready();
    moveTo("Toner", "lips");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentCategories()).toEqual({ ...categories, skincare: ["Cleanser"], lips: ["Gloss", "Toner"] });
  });

  // @spec PROD-CATEDIT-015
  it("deletes a category", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Delete category Toner"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentCategories()).toEqual({ ...categories, skincare: ["Cleanser"] });
  });

  // @spec PROD-CATEDIT-016
  it("deletes a group", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Delete group empty"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const { empty: _removed, ...rest } = categories;
    expect(sentCategories()).toEqual(rest);
  });

  // @spec PROD-CATEDIT-017
  it("renames a category through /api/categories with the trimmed new name", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename category Primer"));
    fill("New name for Primer", "  Base ");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(requests()).toEqual([{ url: expect.stringMatching(/\/api\/categories$/), body: { from: "Primer", to: "Base" } }]);
  });

  // @spec PROD-CATEDIT-044
  it("adds a category when Enter is pressed in its input", async () => {
    renderEditor();
    await ready();
    fill("New category in lips", "Liner");
    fireEvent.keyDown(screen.getByLabelText("New category in lips"), { key: "Enter" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentCategories().lips).toEqual(["Gloss", "Liner"]);
  });

  // @spec PROD-CATEDIT-044
  it("does nothing on Enter in a category input whose Add button is disabled", async () => {
    renderEditor();
    await ready();
    fill("New category in lips", "gloss");
    fireEvent.keyDown(screen.getByLabelText("New category in lips"), { key: "Enter" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // @spec PROD-CATEDIT-045
  it("adds a group when Enter is pressed in the new group input, unless Add group is disabled", async () => {
    renderEditor();
    await ready();
    fill("New group name", "Lips");
    fireEvent.keyDown(screen.getByLabelText("New group name"), { key: "Enter" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();

    fill("New group name", "hair");
    fireEvent.keyDown(screen.getByLabelText("New group name"), { key: "Enter" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentCategories().hair).toEqual([]);
  });
});

describe("category editor disabled controls", () => {
  // @spec PROD-CATEDIT-018
  it("disables Delete on a category that a product uses", async () => {
    renderEditor();
    await ready();
    expect(button("Delete category Primer")).toBeDisabled();
    expect(button("Delete category Cleanser")).toBeDisabled();
    expect(button("Delete category Toner")).toBeEnabled();
  });

  // @spec PROD-CATEDIT-019
  it("disables Delete on a group that has categories", async () => {
    renderEditor();
    await ready();
    expect(button("Delete group lips")).toBeDisabled();
    expect(button("Delete group empty")).toBeEnabled();
  });

  // @spec PROD-CATEDIT-020
  it("disables Move up on the first category of each group and on the first group", async () => {
    renderEditor();
    await ready();
    expect(button("Move category Cleanser up")).toBeDisabled();
    expect(button("Move category Primer up")).toBeDisabled();
    expect(button("Move category Gloss up")).toBeDisabled();
    expect(button("Move category Toner up")).toBeEnabled();
    expect(button("Move group skincare up")).toBeDisabled();
    expect(button("Move group makeup up")).toBeEnabled();
  });

  // @spec PROD-CATEDIT-021
  it("disables Move down on the last category of each group and on the last group", async () => {
    renderEditor();
    await ready();
    expect(button("Move category Toner down")).toBeDisabled();
    expect(button("Move category Foundation down")).toBeDisabled();
    expect(button("Move category Gloss down")).toBeDisabled();
    expect(button("Move category Cleanser down")).toBeEnabled();
    expect(button("Move group empty down")).toBeDisabled();
    expect(button("Move group lips down")).toBeEnabled();
  });

  // @spec PROD-CATEDIT-022
  it("disables Move to while only one group is configured", async () => {
    renderEditor({ categories: { makeup: ["Primer", "Foundation"] }, usage });
    await ready();
    expect(screen.getByLabelText("Move category Primer to")).toBeDisabled();
    expect(screen.getByLabelText("Move category Foundation to")).toBeDisabled();
  });

  // @spec PROD-CATEDIT-023
  it("disables Add while the new category name is blank", async () => {
    renderEditor();
    await ready();
    expect(button("Add category to lips")).toBeDisabled();
    fill("New category in lips", "   ");
    expect(button("Add category to lips")).toBeDisabled();
    fill("New category in lips", "Liner");
    expect(button("Add category to lips")).toBeEnabled();
  });

  // @spec PROD-CATEDIT-024
  it("disables Add while the new category name matches any configured category", async () => {
    renderEditor();
    await ready();
    fill("New category in lips", " primer ");
    expect(button("Add category to lips")).toBeDisabled();
    fill("New category in lips", "GLOSS");
    expect(button("Add category to lips")).toBeDisabled();
  });

  // @spec PROD-CATEDIT-025
  it("disables Add group while the new group name is blank", async () => {
    renderEditor();
    await ready();
    expect(button("Add group")).toBeDisabled();
    fill("New group name", "  ");
    expect(button("Add group")).toBeDisabled();
  });

  // @spec PROD-CATEDIT-026
  it("disables Add group while the new group name matches an existing group", async () => {
    renderEditor();
    await ready();
    fill("New group name", " MakeUp ");
    expect(button("Add group")).toBeDisabled();
    fill("New group name", "hair");
    expect(button("Add group")).toBeEnabled();
  });
});

describe("category editor renaming", () => {
  // @spec PROD-CATEDIT-027
  it("replaces the name with an input holding it, followed by Save and Cancel", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename category Primer"));
    const input = screen.getByLabelText("New name for Primer");
    expect(input).toHaveValue("Primer");
    const item = input.closest("li")!;
    expect(within(item).queryByTestId("category-name")).toBeNull();
    expect(follows(input, within(item).getByRole("button", { name: "Save" }))).toBe(true);
    expect(follows(within(item).getByRole("button", { name: "Save" }), within(item).getByRole("button", { name: "Cancel" }))).toBe(true);

    fireEvent.click(button("Cancel"));
    fireEvent.click(button("Rename group makeup"));
    expect(screen.getByLabelText("New name for makeup")).toHaveValue("makeup");
    expect(within(region("makeup")).queryByRole("heading", { name: "makeup" })).toBeNull();
  });

  // @spec PROD-CATEDIT-028
  it("disables Save while the rename input is blank", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename category Primer"));
    fill("New name for Primer", "   ");
    expect(button("Save")).toBeDisabled();
  });

  // @spec PROD-CATEDIT-029
  it("disables Save while the trimmed name equals the current name, but not for a capitalization change", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename category Primer"));
    expect(button("Save")).toBeDisabled();
    fill("New name for Primer", " Primer ");
    expect(button("Save")).toBeDisabled();
    fill("New name for Primer", "primer");
    expect(button("Save")).toBeEnabled();
  });

  // @spec PROD-CATEDIT-030
  it("disables Save on a category rename that matches another category", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename category Primer"));
    fill("New name for Primer", "foundation");
    expect(button("Save")).toBeDisabled();
    fill("New name for Primer", "Toner ");
    expect(button("Save")).toBeDisabled();
    fill("New name for Primer", "makeup");
    expect(button("Save")).toBeEnabled();
  });

  // @spec PROD-CATEDIT-031
  it("disables Save on a group rename that matches another group", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename group makeup"));
    fill("New name for makeup", " Lips");
    expect(button("Save")).toBeDisabled();
    fill("New name for makeup", "Primer");
    expect(button("Save")).toBeEnabled();
    fill("New name for makeup", "MAKEUP");
    expect(button("Save")).toBeEnabled();
  });

  // @spec PROD-CATEDIT-032
  it("saves on Enter only while Save is enabled", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename category Primer"));
    fireEvent.keyDown(screen.getByLabelText("New name for Primer"), { key: "Enter" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();

    fill("New name for Primer", "Base");
    fireEvent.keyDown(screen.getByLabelText("New name for Primer"), { key: "Enter" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(requests()[0].body).toEqual({ from: "Primer", to: "Base" });
  });

  // @spec PROD-CATEDIT-033
  it("closes the rename input on Cancel or Esc without sending a request", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename category Primer"));
    fill("New name for Primer", "Base");
    fireEvent.click(button("Cancel"));
    expect(screen.queryByLabelText("New name for Primer")).toBeNull();

    fireEvent.click(button("Rename group lips"));
    fill("New name for lips", "lip");
    fireEvent.keyDown(screen.getByLabelText("New name for lips"), { key: "Escape" });
    expect(screen.queryByLabelText("New name for lips")).toBeNull();
    expect(within(region("lips")).getByRole("heading", { name: "lips" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // @spec PROD-CATEDIT-034
  it("closes an open rename input without saving when another Rename is activated", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename category Primer"));
    fill("New name for Primer", "Base");
    fireEvent.click(button("Rename group lips"));
    expect(screen.queryByLabelText("New name for Primer")).toBeNull();
    expect(screen.getByLabelText("New name for lips")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("category editor saving", () => {
  // @spec PROD-CATEDIT-035
  it("disables every edit control while a request is in flight", async () => {
    fetchMock.mockImplementation(never);
    renderEditor();
    await ready();
    fill("New group name", "hair");
    fill("New category in lips", "Liner");
    fireEvent.click(button("Add category to lips"));
    await waitFor(() => expect(button("Add group")).toBeDisabled());
    for (const control of screen.getAllByRole("button")) expect(control).toBeDisabled();
    for (const select of screen.getAllByRole("combobox")) expect(select).toBeDisabled();
  });

  // @spec PROD-CATEDIT-035
  it("disables a rename's Save while it is in flight", async () => {
    fetchMock.mockImplementation(never);
    renderEditor();
    await ready();
    fireEvent.click(button("Rename category Primer"));
    fill("New name for Primer", "Base");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(button("Save")).toBeDisabled());
  });

  // @spec PROD-CATEDIT-046
  it("keeps the rename input and Cancel enabled while the rename is in flight", async () => {
    fetchMock.mockImplementation(never);
    renderEditor();
    await ready();
    fireEvent.click(button("Rename category Primer"));
    fill("New name for Primer", "Base");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(button("Save")).toBeDisabled());
    expect(screen.getByLabelText("New name for Primer")).toBeEnabled();
    expect(button("Cancel")).toBeEnabled();
    fireEvent.click(button("Cancel"));
    expect(screen.queryByLabelText("New name for Primer")).toBeNull();
  });

  // @spec PROD-CATEDIT-036
  it("revalidates the page's loaders after a request, whether it succeeds or fails", async () => {
    const loader = renderEditor();
    await ready();
    const before = loader.mock.calls.length;
    fireEvent.click(button("Delete category Toner"));
    await waitFor(() => expect(loader.mock.calls.length).toBe(before + 1));

    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ error: "Nope" }), { status: 500 })));
    await waitFor(() => expect(button("Delete category Toner")).toBeEnabled());
    fireEvent.click(button("Delete category Toner"));
    await waitFor(() => expect(loader.mock.calls.length).toBe(before + 2));
  });

  // @spec PROD-CATEDIT-036
  it("shows what the revalidated loaders return", async () => {
    const data: PageData = { categories, usage };
    const loader = vi.fn(() => data);
    function Page() {
      const loaded = useLoaderData() as PageData;
      return <CategoryEditor categories={loaded.categories} usage={loaded.usage} />;
    }
    renderPage(Page, loader);
    await ready();
    data.categories = { ...categories, lips: ["Gloss", "Liner"] };
    fill("New category in lips", "Liner");
    fireEvent.click(button("Add category to lips"));
    expect(await within(region("lips")).findByText("Liner")).toBeInTheDocument();
  });

  // @spec PROD-CATEDIT-037
  it("clears the add input after a successful add", async () => {
    renderEditor();
    await ready();
    fill("New category in lips", "Liner");
    fireEvent.click(button("Add category to lips"));
    await waitFor(() => expect(screen.getByLabelText("New category in lips")).toHaveValue(""));

    fill("New group name", "hair");
    fireEvent.click(button("Add group"));
    await waitFor(() => expect(screen.getByLabelText("New group name")).toHaveValue(""));
  });

  // @spec PROD-CATEDIT-038
  it("closes the rename input after a successful rename", async () => {
    renderEditor();
    await ready();
    fireEvent.click(button("Rename category Primer"));
    fill("New name for Primer", "Base");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(screen.queryByLabelText("New name for Primer")).toBeNull());
  });

  // @spec PROD-CATEDIT-039
  it("keeps the typed text when a request fails", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ error: "Nope" }), { status: 400 })));
    renderEditor();
    await ready();
    fill("New category in lips", "Liner");
    fireEvent.click(button("Add category to lips"));
    await screen.findByText("Nope");
    await waitFor(() => expect(button("Add category to lips")).toBeEnabled());
    expect(screen.getByLabelText("New category in lips")).toHaveValue("Liner");

    fireEvent.click(button("Rename category Primer"));
    fill("New name for Primer", "Base");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(button("Save")).toBeEnabled());
    expect(screen.getByLabelText("New name for Primer")).toHaveValue("Base");
  });

  // @spec PROD-CATEDIT-040
  it("shows the server's error message", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ error: "Category \"Toner\" is still used" }), { status: 400 })));
    renderEditor();
    await ready();
    fireEvent.click(button("Delete category Toner"));
    expect(await screen.findByText("Category \"Toner\" is still used")).toBeInTheDocument();
  });

  // @spec PROD-CATEDIT-041
  it.each([["no body", ""], ["a body without an error", "{}"], ["an empty error", '{"error":""}']])(
    "says the change was not saved for an error status with %s",
    async (_label, body) => {
      fetchMock.mockImplementation(() => Promise.resolve(new Response(body, { status: 500 })));
      renderEditor();
      await ready();
      fireEvent.click(button("Delete category Toner"));
      expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
    },
  );

  // @spec PROD-CATEDIT-042
  it("says the change was not saved when there is no response", async () => {
    fetchMock.mockImplementation(() => Promise.reject(new TypeError("Failed to fetch")));
    renderEditor();
    await ready();
    fireEvent.click(button("Delete category Toner"));
    expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
  });
});
