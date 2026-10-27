import { chmod } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dataDir, readData, sampleUsage, settle, writeData } from "@/test/data-dir";
import { action, loader } from "./api.usage";

function post(body: unknown) {
  const request = new Request("http://localhost/api/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return settle(() => action({ request } as Parameters<typeof action>[0]));
}

function get() {
  return settle(() => loader({} as Parameters<typeof loader>[0]));
}

async function expectError(result: unknown, status: number) {
  expect(result).toBeInstanceOf(Response);
  const response = result as Response;
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(typeof body.error).toBe("string");
  expect(body.error.length).toBeGreaterThan(0);
}

async function usesThisMonth(id: number) {
  const usage: typeof sampleUsage = await readData("usage.json");
  return usage.find((item) => item.id === id)!.usesThisMonth;
}

describe("/api/usage", () => {
  beforeEach(() => {
    // Inside the sample data's current month, so no rollover happens.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 26));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // @spec USAGE-001
  it("returns product records with id, name, brand, category, uses, current month, and current-month count", async () => {
    await writeData("usage.json", sampleUsage);
    const result = await get();
    const records = result instanceof Response ? await result.json() : result;
    expect(Object.keys(records[0]).sort()).toEqual(
      ["brand", "category", "currentMonth", "id", "name", "uses", "usesThisMonth"].sort(),
    );
  });

  // @spec USAGE-002
  it("finds products by id, not by position in usage.json", async () => {
    const reordered = [
      { ...sampleUsage[0], id: 7 },
      { ...sampleUsage[1], id: 0 },
    ];
    await writeData("usage.json", reordered);
    await post({ ids: [0], delta: 1 });
    const usage = await readData("usage.json");
    expect(usage[1].usesThisMonth).toBe(reordered[1].usesThisMonth + 1);
    expect(usage[0].usesThisMonth).toBe(reordered[0].usesThisMonth);
  });

  // @spec USAGE-API-001
  it("returns the full list of product records on GET", async () => {
    await writeData("usage.json", sampleUsage);
    const result = await get();
    const records = result instanceof Response ? await result.json() : result;
    expect(records).toEqual(sampleUsage);
  });

  // @spec USAGE-API-002
  it("responds 500 with an error message when usage.json cannot be read on GET", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expectError(await get(), 500);
  });

  // @spec USAGE-API-003
  it("applies delta to each listed product and writes usage.json", async () => {
    await writeData("usage.json", sampleUsage);
    await post({ ids: [0, 2], delta: 1 });
    expect(await usesThisMonth(0)).toBe(3);
    expect(await usesThisMonth(1)).toBe(0);
    expect(await usesThisMonth(2)).toBe(2);
  });

  // @spec USAGE-LOG-003
  it("applies a -1 to every product in the set", async () => {
    await writeData("usage.json", sampleUsage);
    await post({ ids: [0, 2], delta: -1 });
    expect(await usesThisMonth(0)).toBe(1);
    expect(await usesThisMonth(2)).toBe(0);
  });

  // @spec USAGE-LOG-006
  it("leaves a count of 0 at 0 and still decrements the other products", async () => {
    await writeData("usage.json", sampleUsage);
    await post({ ids: [0, 1], delta: -1 });
    expect(await usesThisMonth(1)).toBe(0);
    expect(await usesThisMonth(0)).toBe(1);
  });

  describe("validation", () => {
    beforeEach(async () => {
      await writeData("usage.json", sampleUsage);
    });

    // @spec USAGE-API-004
    it("rejects a body missing ids or delta, or with other keys", async () => {
      await expectError(await post({ ids: [0] }), 400);
      await expectError(await post({ delta: 1 }), 400);
      await expectError(await post({ ids: [0], delta: 1, note: "x" }), 400);
    });

    // @spec USAGE-API-005
    it("rejects ids that are not a non-empty array of integers", async () => {
      await expectError(await post({ ids: [], delta: 1 }), 400);
      await expectError(await post({ ids: [1.5], delta: 1 }), 400);
      await expectError(await post({ ids: "0", delta: 1 }), 400);
    });

    // @spec USAGE-API-006
    it("rejects duplicate ids", async () => {
      await expectError(await post({ ids: [0, 0], delta: 1 }), 400);
    });

    // @spec USAGE-API-007
    it("rejects an id that matches no product", async () => {
      await expectError(await post({ ids: [0, 99], delta: 1 }), 400);
    });

    // @spec USAGE-API-008
    it("rejects a delta other than 1 or -1", async () => {
      await expectError(await post({ ids: [0], delta: 2 }), 400);
      await expectError(await post({ ids: [0], delta: "1" }), 400);
    });

    // @spec USAGE-API-009
    it("responds 400 with an error message on validation failure", async () => {
      await expectError(await post({ ids: [99], delta: 1 }), 400);
    });

    // @spec USAGE-API-010
    it("leaves usage.json unchanged on validation failure", async () => {
      await post({ ids: [0, 99], delta: 1 });
      expect(await readData("usage.json")).toEqual(sampleUsage);
    });
  });

  // @spec USAGE-API-011
  it("responds 500 when usage.json cannot be read or written", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expectError(await post({ ids: [0], delta: 1 }), 500);

    await writeData("usage.json", sampleUsage);
    await chmod(dataDir(), 0o555);
    try {
      await expectError(await post({ ids: [0], delta: 1 }), 500);
    } finally {
      await chmod(dataDir(), 0o755);
    }
  });

  // @spec USAGE-API-012
  it("leaves usage.json unchanged when it cannot be written", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await writeData("usage.json", sampleUsage);
    await chmod(dataDir(), 0o555);
    try {
      await post({ ids: [0], delta: 1 });
    } finally {
      await chmod(dataDir(), 0o755);
    }
    expect(await readData("usage.json")).toEqual(sampleUsage);
  });
});
