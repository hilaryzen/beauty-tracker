import { chmod, rename } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dataDir, readData, readRaw, sampleUsage, settle, writeData } from "@/test/data-dir";
import { action } from "./api.purchases";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, rename: vi.fn(actual.rename) };
});

function send(method: "POST" | "PUT" | "PATCH" | "DELETE", rawBody: string) {
  const request = new Request("http://localhost/api/purchases", {
    method,
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
  return settle(() => action({ request } as Parameters<typeof action>[0]));
}

function post(body: unknown) {
  return send("POST", JSON.stringify(body));
}

async function expectError(result: unknown, status: number) {
  expect(result).toBeInstanceOf(Response);
  const response = result as Response;
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(typeof body.error).toBe("string");
  expect(body.error.length).toBeGreaterThan(0);
}

const bought = { date: "2026-09-30", store: "Ulta", price: 1850 };
// Product 2 already has a purchase; products 0 and 1 do not.
const usage = [sampleUsage[0], sampleUsage[1], { ...sampleUsage[2], purchase: bought }];

const purchase = {
  date: "2026-10-20",
  store: "Sephora",
  items: [
    { productId: 1, price: 4200 },
    { productId: 0, price: 0 },
  ],
};

async function expectUnchanged(before: string) {
  expect(await readRaw("usage.json")).toBe(before);
}

async function withReadOnlyDataDir<T>(fn: () => Promise<T>) {
  await chmod(dataDir(), 0o555);
  try {
    return await fn();
  } finally {
    await chmod(dataDir(), 0o755);
  }
}

describe("/api/purchases", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 26, 23, 30)); // 26 October 2026, late evening local time
    vi.spyOn(console, "error").mockImplementation(() => {});
    await writeData("usage.json", usage);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("adding a purchase", () => {
    // @spec PURCH-001, PURCH-API-001
    it("sets each item's product purchase to the date, store, and item's price", async () => {
      expect(await post(purchase)).toBeNull();
      const saved = await readData("usage.json");
      expect(saved[1].purchase).toEqual({ date: "2026-10-20", store: "Sephora", price: 4200 });
      expect(saved[0].purchase).toEqual({ date: "2026-10-20", store: "Sephora", price: 0 });
    });

    // @spec PURCH-001, PURCH-API-001
    it("records no store when the body has none", async () => {
      const { store: _store, ...withoutStore } = purchase;
      expect(await post(withoutStore)).toBeNull();
      const saved = await readData("usage.json");
      expect(saved[1].purchase).toEqual({ date: "2026-10-20", price: 4200 });
    });

    // @spec PURCH-API-001
    it("accepts today's date", async () => {
      expect(await post({ ...purchase, date: "2026-10-26" })).toBeNull();
    });

    // @spec PURCH-API-002
    it("leaves every other field and every other record unchanged", async () => {
      await post(purchase);
      const saved = await readData("usage.json");
      for (const index of [0, 1]) {
        const { purchase: _purchase, ...rest } = saved[index];
        expect(rest).toEqual(usage[index]);
      }
      expect(saved[2]).toEqual(usage[2]);
      expect(saved).toHaveLength(usage.length);
    });

    // @spec PURCH-API-003
    it("writes usage.json once", async () => {
      vi.mocked(rename).mockClear();
      await post(purchase);
      expect(rename).toHaveBeenCalledTimes(1);
    });

    // @spec PURCH-API-019
    it("applies only the first of overlapping purchases that name the same product", async () => {
      const first = { date: "2026-10-20", items: [{ productId: 0, price: 100 }] };
      const second = { date: "2026-10-21", items: [{ productId: 0, price: 200 }] };
      const results = await Promise.all([post(first), post(second)]);
      expect(results[0]).toBeNull();
      await expectError(results[1], 400);
      expect((await readData("usage.json"))[0].purchase).toEqual({ date: "2026-10-20", price: 100 });
    });
  });

  describe("validation", () => {
    // @spec PURCH-API-004
    it("rejects a body that is not valid JSON or not an object", async () => {
      await expectError(await send("POST", "{not json"), 400);
      await expectError(await send("POST", "[]"), 400);
      await expectError(await send("POST", "null"), 400);
      await expectError(await send("POST", '"text"'), 400);
    });

    // @spec PURCH-API-005
    it("rejects a body missing date or items, or with any other key", async () => {
      const { date: _date, ...noDate } = purchase;
      const { items: _items, ...noItems } = purchase;
      await expectError(await post(noDate), 400);
      await expectError(await post(noItems), 400);
      await expectError(await post({ ...purchase, total: 4200 }), 400);
    });

    // @spec PURCH-API-006
    it("rejects a date that is not a real calendar date in YYYY-MM-DD form", async () => {
      for (const bad of ["2026-02-30", "2026-13-01", "2026-1-05", "10/20/2026", "2026-10-20T00:00", "", 20261020, null]) {
        await expectError(await post({ ...purchase, date: bad }), 400);
      }
    });

    // @spec PURCH-API-007
    it("rejects a date after the server's current local date", async () => {
      await expectError(await post({ ...purchase, date: "2026-10-27" }), 400);
    });

    // @spec PURCH-API-008
    it("rejects a store that is not a string, is blank, or has surrounding whitespace", async () => {
      for (const bad of ["", "   ", " Sephora", "Sephora ", 3, null]) {
        await expectError(await post({ ...purchase, store: bad }), 400);
      }
    });

    // @spec PURCH-API-009
    it("rejects items that are not a non-empty array", async () => {
      for (const bad of [[], {}, "items", null]) {
        await expectError(await post({ ...purchase, items: bad }), 400);
      }
    });

    // @spec PURCH-API-010
    it("rejects an item that is not an object with exactly productId and price", async () => {
      for (const bad of [null, 1, [0, 100], { productId: 0 }, { price: 100 }, { productId: 0, price: 100, note: "x" }]) {
        await expectError(await post({ ...purchase, items: [bad] }), 400);
      }
    });

    // @spec PURCH-API-011
    it("rejects a price that is not an integer of 0 or more", async () => {
      for (const bad of [-1, 12.5, "1200", null]) {
        await expectError(await post({ ...purchase, items: [{ productId: 0, price: bad }] }), 400);
      }
    });

    // @spec PURCH-API-012
    it("rejects a productId that is not an integer matching a product", async () => {
      for (const bad of [99, "0", 0.5, null]) {
        await expectError(await post({ ...purchase, items: [{ productId: bad, price: 100 }] }), 400);
      }
    });

    // @spec PURCH-API-013
    it("rejects a product that already has a purchase", async () => {
      await expectError(await post({ ...purchase, items: [{ productId: 2, price: 100 }] }), 400);
    });

    // @spec PURCH-API-014
    it("rejects the same product on two items", async () => {
      const items = [
        { productId: 0, price: 100 },
        { productId: 0, price: 200 },
      ];
      await expectError(await post({ ...purchase, items }), 400);
    });

    // @spec PURCH-API-015
    it("responds 400 with an error message on validation failure", async () => {
      await expectError(await post({ ...purchase, date: "2026-10-27" }), 400);
    });

    // @spec PURCH-API-016
    it("leaves usage.json unchanged on validation failure", async () => {
      const before = await readRaw("usage.json");
      await post({ ...purchase, items: [{ productId: 1, price: 100 }, { productId: 2, price: 100 }] });
      await post({ ...purchase, store: "" });
      await send("POST", "{not json");
      await expectUnchanged(before);
    });
  });

  // @spec PURCH-API-017
  it("responds 500 with an error message when usage.json cannot be read or written", async () => {
    await withReadOnlyDataDir(async () => expectError(await post(purchase), 500));

    const { rm } = await import("node:fs/promises");
    await rm(`${dataDir()}/usage.json`);
    await expectError(await post(purchase), 500);
  });

  // @spec PURCH-API-018
  it("leaves usage.json unchanged when it cannot be written", async () => {
    const before = await readRaw("usage.json");
    await withReadOnlyDataDir(() => post(purchase));
    await expectUnchanged(before);
  });

  // @spec PURCH-API-020
  it("responds 405 with an error message to PUT, PATCH, and DELETE", async () => {
    for (const method of ["PUT", "PATCH", "DELETE"] as const) {
      await expectError(await send(method, JSON.stringify(purchase)), 405);
    }
  });

  // @spec PURCH-API-021
  it("leaves usage.json unchanged on PUT, PATCH, and DELETE", async () => {
    const before = await readRaw("usage.json");
    for (const method of ["PUT", "PATCH", "DELETE"] as const) {
      await send(method, JSON.stringify(purchase));
    }
    await expectUnchanged(before);
  });
});
