// @vitest-environment jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLoaderData } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleUsage } from "@/test/data-dir";
import { renderPage } from "@/test/render";
import { RoutineCard } from "./routine-card";

type PageData = { usage: typeof sampleUsage; routines?: Record<string, number[]> };

function Page() {
  const { usage, routines } = useLoaderData() as PageData;
  return <RoutineCard usage={usage} routines={routines as Record<string, number[]>} />;
}

function renderCards(routines: Record<string, number[]> | undefined) {
  renderPage(Page, () => ({ usage: sampleUsage, routines }));
}

async function card(title: string) {
  return (await screen.findByText(title)).closest(".chakra-card__root") as HTMLElement;
}

function titles() {
  return Array.from(document.querySelectorAll(".chakra-card__title")).map((el) => el.textContent);
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

describe("routine cards", () => {
  // @spec ROUT-UI-001
  it("shows one card per routine in configuration order, with integer-like names first", async () => {
    renderCards({ "Morning Skincare": [2], Makeup: [0, 1], "2": [0] });
    await card("Makeup");
    expect(titles()).toEqual(["2", "Morning Skincare", "Makeup"]);
  });

  // @spec ROUT-UI-002
  it("shows the routine's name as the card title", async () => {
    renderCards({ Makeup: [0, 1] });
    const makeup = await card("Makeup");
    expect(within(makeup).getByText("Makeup")).toHaveClass("chakra-card__title");
  });

  // @spec ROUT-UI-003
  it("lists product names found by id, in the routine's order", async () => {
    // Ids out of array order: id 2 is at index 2, id 0 at index 0.
    const usage = [sampleUsage[1], sampleUsage[2], sampleUsage[0]].map((item, index) => ({
      ...item,
      id: [1, 2, 0][index],
    }));
    renderPage(Page, () => ({ usage, routines: { Makeup: [0, 2] } }));
    const items = within(await card("Makeup")).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "Hydro Grip Primer",
      "Blueberry Bounce Gentle Cleanser",
    ]);
  });

  // @spec ROUT-UI-004
  it("shows a + and a − control on each card", async () => {
    renderCards({ Makeup: [0, 1] });
    const makeup = await card("Makeup");
    expect(within(makeup).getByRole("button", { name: "+" })).toBeInTheDocument();
    expect(within(makeup).getByRole("button", { name: "-" })).toBeInTheDocument();
  });

  // @spec ROUT-UI-005
  it("shows a placeholder for a product id that matches no product", async () => {
    renderCards({ Makeup: [0, 42] });
    const makeup = await card("Makeup");
    expect(within(makeup).getByText("Unknown product (id 42)")).toBeInTheDocument();
    expect(within(makeup).getByText("Hydro Grip Primer")).toBeInTheDocument();
  });

  // @spec ROUT-UI-006
  it("shows no cards when routines are empty or missing", async () => {
    renderCards({});
    await waitFor(() => expect(document.body).toBeInTheDocument());
    expect(document.querySelectorAll(".chakra-card__root")).toHaveLength(0);

    renderCards(undefined);
    await waitFor(() => expect(document.body).toBeInTheDocument());
    expect(document.querySelectorAll(".chakra-card__root")).toHaveLength(0);
    expect(screen.queryByText(/Unexpected Application Error/i)).not.toBeInTheDocument();
  });
});

describe("logging a routine", () => {
  // @spec ROUT-LOG-001
  it("logs +1 for every product in the routine as one request", async () => {
    renderCards({ Makeup: [0, 1] });
    fireEvent.click(within(await card("Makeup")).getByRole("button", { name: "+" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({ ids: [0, 1], delta: 1 });
  });

  // @spec ROUT-LOG-002
  it("logs -1 for every product in the routine as one request", async () => {
    renderCards({ Makeup: [0, 1] });
    fireEvent.click(within(await card("Makeup")).getByRole("button", { name: "-" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({ ids: [0, 1], delta: -1 });
  });
});
