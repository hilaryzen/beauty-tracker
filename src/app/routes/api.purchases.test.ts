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

    // @spec PURCH-API-022
    it("accepts items whose products are finished", async () => {
      await writeData("usage.json", [
        { ...usage[0], status: "Decluttered" },
        { ...usage[1], status: "Panned" },
        usage[2],
      ]);
      expect(await post(purchase)).toBeNull();
      const saved = await readData("usage.json");
      expect(saved[1].purchase).toEqual({ date: "2026-10-20", store: "Sephora", price: 4200 });
      expect(saved[0].purchase).toEqual({ date: "2026-10-20", store: "Sephora", price: 0 });
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
  it("responds 405 with an error message to PATCH", async () => {
    await expectError(await send("PATCH", JSON.stringify(purchase)), 405);
  });

  // @spec PURCH-API-021
  it("leaves usage.json unchanged on PATCH", async () => {
    const before = await readRaw("usage.json");
    await send("PATCH", JSON.stringify(purchase));
    await expectUnchanged(before);
  });
});

describe("/api/purchases editing and deleting", () => {
  const sephora = (price: number) => ({ date: "2026-10-20", store: "Sephora", price });
  // Products 1 and 2 form one purchase; 3 and 4 are other purchases; 0 has none.
  const extra = (id: number, purchase: object) => ({ ...sampleUsage[0], id, name: `Product ${id}`, purchase });
  const records = [
    sampleUsage[0],
    { ...sampleUsage[1], purchase: sephora(4200) },
    { ...sampleUsage[2], purchase: sephora(0) },
    extra(3, { date: "2026-09-30", store: "Ulta", price: 1850 }),
    extra(4, { date: "2026-10-20", price: 500 }),
  ];

  const edit = { replaces: [1, 2], date: "2026-10-19", store: "Ulta", items: [{ productId: 1, price: 3900 }] };

  function put(body: unknown) {
    return send("PUT", JSON.stringify(body));
  }

  function del(body: unknown) {
    return send("DELETE", JSON.stringify(body));
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 26, 23, 30)); // 26 October 2026, late evening local time
    vi.spyOn(console, "error").mockImplementation(() => {});
    await writeData("usage.json", records);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("editing a purchase", () => {
    // @spec PURCH-API-023
    it("sets each item's product purchase to the date, store, and item's price", async () => {
      const body = { ...edit, items: [{ productId: 2, price: 100 }, { productId: 0, price: 250 }] };
      expect(await put(body)).toBeNull();
      const saved = await readData("usage.json");
      expect(saved[2].purchase).toEqual({ date: "2026-10-19", store: "Ulta", price: 100 });
      expect(saved[0].purchase).toEqual({ date: "2026-10-19", store: "Ulta", price: 250 });
    });

    // @spec PURCH-API-023
    it("records no store when the body has none", async () => {
      const { store: _store, ...withoutStore } = edit;
      expect(await put(withoutStore)).toBeNull();
      expect((await readData("usage.json"))[1].purchase).toEqual({ date: "2026-10-19", price: 3900 });
    });

    // @spec PURCH-API-024
    it("removes the purchase from each replaced product that no item names", async () => {
      await put(edit);
      const saved = await readData("usage.json");
      expect(saved[2]).not.toHaveProperty("purchase");
      expect(saved[1].purchase).toEqual({ date: "2026-10-19", store: "Ulta", price: 3900 });
    });

    // @spec PURCH-API-026
    it("leaves every other field and every product the body does not name unchanged", async () => {
      await put(edit);
      const saved = await readData("usage.json");
      for (const index of [1, 2]) {
        const { purchase: _saved, ...rest } = saved[index];
        const { purchase: _before, ...expected } = records[index];
        expect(rest).toEqual(expected);
      }
      for (const index of [0, 3, 4]) expect(saved[index]).toEqual(records[index]);
      expect(saved).toHaveLength(records.length);
    });

    // @spec PURCH-API-027
    it("writes usage.json once", async () => {
      vi.mocked(rename).mockClear();
      await put(edit);
      expect(rename).toHaveBeenCalledTimes(1);
    });

    // @spec PURCH-API-022
    it("accepts finished products", async () => {
      await writeData("usage.json", records.map((record) => ({ ...record, status: "Panned" })));
      expect(await put({ ...edit, items: [{ productId: 1, price: 1 }, { productId: 0, price: 2 }] })).toBeNull();
    });
  });

  describe("deleting a purchase", () => {
    // @spec PURCH-API-025
    it("removes the purchase from each named product", async () => {
      expect(await del({ productIds: [1, 2] })).toBeNull();
      const saved = await readData("usage.json");
      expect(saved[1]).not.toHaveProperty("purchase");
      expect(saved[2]).not.toHaveProperty("purchase");
    });

    // @spec PURCH-API-026
    it("leaves every other field and every product the body does not name unchanged", async () => {
      await del({ productIds: [1, 2] });
      const saved = await readData("usage.json");
      for (const index of [1, 2]) {
        const { purchase: _before, ...expected } = records[index];
        expect(saved[index]).toEqual(expected);
      }
      for (const index of [0, 3, 4]) expect(saved[index]).toEqual(records[index]);
    });

    // @spec PURCH-API-027
    it("writes usage.json once", async () => {
      vi.mocked(rename).mockClear();
      await del({ productIds: [1, 2] });
      expect(rename).toHaveBeenCalledTimes(1);
    });

    // @spec PURCH-API-022
    it("accepts finished products", async () => {
      await writeData("usage.json", records.map((record) => ({ ...record, status: "Decluttered" })));
      expect(await del({ productIds: [1, 2] })).toBeNull();
    });
  });

  describe("validation", () => {
    // @spec PURCH-API-004
    it("rejects a PUT or DELETE body that is not valid JSON or not an object", async () => {
      for (const method of ["PUT", "DELETE"] as const) {
        for (const raw of ["{not json", "[]", "null"]) await expectError(await send(method, raw), 400);
      }
    });

    // @spec PURCH-API-028
    it("rejects a PUT body missing replaces, date, or items, or with any other key", async () => {
      const { replaces: _r, ...noReplaces } = edit;
      const { date: _d, ...noDate } = edit;
      const { items: _i, ...noItems } = edit;
      for (const bad of [noReplaces, noDate, noItems, { ...edit, productIds: [1, 2] }]) {
        await expectError(await put(bad), 400);
      }
    });

    // @spec PURCH-API-029
    it("rejects a DELETE body missing productIds or with any other key", async () => {
      await expectError(await del({}), 400);
      await expectError(await del({ productIds: [1, 2], date: "2026-10-20" }), 400);
    });

    // @spec PURCH-API-030
    it("rejects replaces or productIds that are not a non-empty array of integers", async () => {
      for (const bad of [[], [1.5], ["1"], 1, null]) {
        await expectError(await put({ ...edit, replaces: bad }), 400);
        await expectError(await del({ productIds: bad }), 400);
      }
    });

    // @spec PURCH-API-031
    it("rejects replaces or productIds that list an id twice", async () => {
      await expectError(await put({ ...edit, replaces: [1, 2, 1] }), 400);
      await expectError(await del({ productIds: [1, 1, 2] }), 400);
    });

    // @spec PURCH-API-032
    it("rejects replaces or productIds naming no product record", async () => {
      await expectError(await put({ ...edit, replaces: [1, 99] }), 400);
      await expectError(await del({ productIds: [99] }), 400);
    });

    // @spec PURCH-API-033
    it("rejects replaces or productIds naming a product with no purchase", async () => {
      await expectError(await put({ ...edit, replaces: [0] }), 400);
      await expectError(await del({ productIds: [0] }), 400);
    });

    // @spec PURCH-API-034
    it("rejects replaces or productIds whose products are not all in one purchase", async () => {
      // 1 and 3 differ in date and store; 1 and 4 share a date but only 1 has a store.
      for (const ids of [[1, 3], [1, 4]]) {
        await expectError(await put({ ...edit, replaces: ids }), 400);
        await expectError(await del({ productIds: ids }), 400);
      }
      await writeData("usage.json", [records[0], records[1], { ...records[2], purchase: { ...sephora(0), store: "Ulta" } }]);
      await expectError(await del({ productIds: [1, 2] }), 400);
    });

    // @spec PURCH-API-035
    it("rejects an item naming a product with a purchase that replaces does not name", async () => {
      await expectError(await put({ ...edit, items: [{ productId: 3, price: 100 }] }), 400);
    });

    // @spec PURCH-API-006, PURCH-API-007, PURCH-API-008
    it("rejects a PUT whose date or store breaks the field rules", async () => {
      for (const date of ["2026-02-30", "10/20/2026", "2026-10-27"]) await expectError(await put({ ...edit, date }), 400);
      for (const store of ["", " Ulta", 3]) await expectError(await put({ ...edit, store }), 400);
    });

    // @spec PURCH-API-009, PURCH-API-010, PURCH-API-011, PURCH-API-012, PURCH-API-014
    it("rejects a PUT whose items break the item rules", async () => {
      const bad = [
        [],
        [{ productId: 1 }],
        [{ productId: 1, price: -1 }],
        [{ productId: 99, price: 100 }],
        [{ productId: 1, price: 100 }, { productId: 1, price: 200 }],
      ];
      for (const items of bad) await expectError(await put({ ...edit, items }), 400);
    });

    // @spec PURCH-API-016
    it("leaves usage.json unchanged on validation failure", async () => {
      const before = await readRaw("usage.json");
      await put({ ...edit, items: [{ productId: 1, price: 100 }, { productId: 3, price: 100 }] });
      await del({ productIds: [1, 3] });
      await expectUnchanged(before);
    });
  });

  // @spec PURCH-API-036
  it("checks overlapping requests against the records left by those applied before them", async () => {
    const results = await Promise.all([del({ productIds: [1, 2] }), put(edit)]);
    expect(results[0]).toBeNull();
    await expectError(results[1], 400);
    const saved = await readData("usage.json");
    expect(saved[1]).not.toHaveProperty("purchase");
  });

  // @spec PURCH-API-017
  it("responds 500 with an error message when usage.json cannot be written", async () => {
    await withReadOnlyDataDir(async () => {
      await expectError(await put(edit), 500);
      await expectError(await del({ productIds: [1, 2] }), 500);
    });
  });

  // @spec PURCH-API-018
  it("leaves usage.json unchanged when it cannot be written", async () => {
    const before = await readRaw("usage.json");
    await withReadOnlyDataDir(async () => {
      await put(edit);
      await del({ productIds: [1, 2] });
    });
    await expectUnchanged(before);
  });
});
