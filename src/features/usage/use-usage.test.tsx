// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useLoaderData } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toaster } from "@/components/ui/toaster";
import { renderPage } from "@/test/render";
import { useUsage } from "./use-usage";

// A minimal caller of useUsage: shows a value from the page's loader data, and
// logs uses for a fixed set of products, as the inventory table and routine cards do.
function Page() {
  const { count } = useLoaderData() as { count: number };
  const { addUsesToItems, removeUsesFromItems } = useUsage();
  return (
    <>
      <output data-testid="count">{count}</output>
      <button onClick={() => addUsesToItems([0, 1])}>Add</button>
      <button onClick={() => removeUsesFromItems([0])}>Remove</button>
    </>
  );
}

function renderHarness() {
  const loader = vi.fn(() => ({ count: 27 }));
  renderPage(Page, loader);
  return loader;
}

async function click(name: string) {
  fireEvent.click(await screen.findByRole("button", { name }));
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

describe("logging a use with useUsage", () => {
  // @spec USAGE-LOG-004
  it("sends a single POST to /api/usage with { ids, delta }", async () => {
    renderHarness();
    await click("Add");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toMatch(/\/api\/usage$/);
    expect(init.method?.toUpperCase()).toBe("POST");
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({ ids: [0, 1], delta: 1 });
  });

  // @spec USAGE-LOG-004
  it("sends delta -1 when removing a use", async () => {
    renderHarness();
    await click("Remove");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({ ids: [0], delta: -1 });
  });

  // @spec USAGE-LOG-005
  it("reloads the page data after a successful save", async () => {
    const loader = renderHarness();
    await screen.findByTestId("count");
    expect(loader).toHaveBeenCalledTimes(1);
    await click("Add");
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  });

  // @spec USAGE-LOG-007
  it("shows an error notification when the save fails", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "disk full" }), { status: 500 }));
    renderHarness();
    await click("Add");
    expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
  });

  // @spec USAGE-LOG-008
  it("keeps showing the last saved data when the save fails", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "bad id" }), { status: 400 }));
    const loader = renderHarness();
    await click("Add");
    await screen.findByText(/not saved/i);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("count")).toHaveTextContent("27");
  });

  // @spec USAGE-LOG-009
  it("sends a new request without cancelling one still in flight", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    renderHarness();
    await click("Add");
    await click("Add");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const firstSignal = (fetchMock.mock.calls[0][1] as RequestInit | undefined)?.signal;
    expect(firstSignal?.aborted ?? false).toBe(false);
  });

  // @spec USAGE-LOG-010
  it("shows an error notification when the request gets no response", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderHarness();
    await click("Add");
    expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
  });

  // @spec USAGE-LOG-011
  it("keeps showing the last saved data when the request gets no response", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const loader = renderHarness();
    await click("Add");
    await screen.findByText(/not saved/i);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("count")).toHaveTextContent("27");
  });
});
