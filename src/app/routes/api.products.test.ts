import { chmod, rename, rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dataDir, readData, sampleConfigs, sampleUsage, settle, writeData } from "@/test/data-dir";
import { action } from "./api.products";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, rename: vi.fn(actual.rename) };
});

function send(method: "POST" | "PUT" | "PATCH" | "DELETE", rawBody: string) {
  const request = new Request("http://localhost/api/products", {
    method,
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
  return settle(() => action({ request } as Parameters<typeof action>[0]));
}

function post(body: unknown) {
  return send("POST", JSON.stringify(body));
}

function put(body: unknown) {
  return send("PUT", JSON.stringify(body));
}

async function expectError(result: unknown, status: number) {
  expect(result).toBeInstanceOf(Response);
  const response = result as Response;
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(typeof body.error).toBe("string");
  expect(body.error.length).toBeGreaterThan(0);
}

const newProduct = { name: "Dew Serum", brand: "Saie", category: "Cleanser" };
const changes = { id: 0, name: "Renamed Primer", brand: "New Brand", category: "Foundation" };

describe("/api/products", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 26));
    await writeData("usage.json", sampleUsage);
    await writeData("configs.json", sampleConfigs);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("adding a product", () => {
    // @spec PROD-API-001
    it("appends a record with the body's name, brand, and category", async () => {
      await post(newProduct);
      const usage = await readData("usage.json");
      expect(usage).toHaveLength(sampleUsage.length + 1);
      expect(usage.slice(0, sampleUsage.length)).toEqual(sampleUsage);
      expect(usage.at(-1)).toMatchObject(newProduct);
    });

    // @spec PROD-API-002
    it("assigns one more than the highest existing id, regardless of order or gaps", async () => {
      await writeData("usage.json", [
        { ...sampleUsage[0], id: 7 },
        { ...sampleUsage[1], id: 2 },
      ]);
      await post(newProduct);
      expect((await readData("usage.json")).at(-1).id).toBe(8);
    });

    // @spec PROD-API-002
    it("assigns id 0 when there are no products", async () => {
      await writeData("usage.json", []);
      await post(newProduct);
      expect((await readData("usage.json"))[0].id).toBe(0);
    });

    // @spec PROD-API-003
    it("starts the record with no history, the server's current month, and 0 uses", async () => {
      vi.setSystemTime(new Date(2026, 10, 3));
      await post(newProduct);
      expect((await readData("usage.json")).at(-1)).toMatchObject({
        uses: {},
        currentMonth: "2026-11",
        usesThisMonth: 0,
      });
    });

    // @spec PROD-API-020
    it("responds with the new record's id", async () => {
      const result = await post(newProduct);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(200);
      expect(await (result as Response).json()).toEqual({ id: 3 });
      expect((await readData("usage.json")).at(-1).id).toBe(3);
    });

    // @spec PROD-API-021
    it("gives the new record no purchase", async () => {
      await post(newProduct);
      expect((await readData("usage.json")).at(-1)).not.toHaveProperty("purchase");
    });

    // @spec PROD-API-017
    it("gives overlapping adds different ids", async () => {
      await Promise.all([post(newProduct), post(newProduct), post(newProduct)]);
      const ids = (await readData("usage.json")).map((record: { id: number }) => record.id);
      expect(ids).toEqual([0, 1, 2, 3, 4, 5]);
    });
  });

  describe("editing a product", () => {
    // @spec PROD-API-004
    it("replaces the name, brand, and category of the matching record", async () => {
      expect(await put(changes)).toBeNull();
      const usage = await readData("usage.json");
      expect(usage[0]).toMatchObject({ name: "Renamed Primer", brand: "New Brand", category: "Foundation" });
      expect(usage.slice(1)).toEqual(sampleUsage.slice(1));
    });

    // @spec PROD-003, PROD-API-022
    it("leaves the record's purchase, or its absence, unchanged", async () => {
      const purchase = { date: "2026-10-02", store: "Sephora", price: 3200 };
      await writeData("usage.json", [{ ...sampleUsage[0], purchase }, ...sampleUsage.slice(1)]);
      expect(await put(changes)).toBeNull();
      expect(await put({ ...changes, id: 1 })).toBeNull();
      const usage = await readData("usage.json");
      expect(usage[0].purchase).toEqual(purchase);
      expect(usage[1]).not.toHaveProperty("purchase");
    });

    // @spec PROD-002, PROD-API-004
    it("finds the record by id, not by position", async () => {
      await writeData("usage.json", [
        { ...sampleUsage[0], id: 7 },
        { ...sampleUsage[1], id: 0 },
      ]);
      await put(changes);
      const usage = await readData("usage.json");
      expect(usage[0].name).toBe(sampleUsage[0].name);
      expect(usage[1].name).toBe("Renamed Primer");
    });

    // @spec PROD-API-005
    it("leaves the id and counts unchanged, without rolling the record over", async () => {
      vi.setSystemTime(new Date(2026, 10, 3));
      await put(changes);
      const { id, uses, currentMonth, usesThisMonth } = (await readData("usage.json"))[0];
      const before = sampleUsage[0];
      expect({ id, uses, currentMonth, usesThisMonth }).toEqual({
        id: before.id,
        uses: before.uses,
        currentMonth: before.currentMonth,
        usesThisMonth: before.usesThisMonth,
      });
    });
  });

  // @spec PROD-API-006
  it("writes usage.json once per request", async () => {
    vi.mocked(rename).mockClear();
    await post(newProduct);
    expect(rename).toHaveBeenCalledTimes(1);

    vi.mocked(rename).mockClear();
    await put(changes);
    expect(rename).toHaveBeenCalledTimes(1);
  });

  describe("validation", () => {
    // @spec PROD-API-007
    it("rejects a POST missing a required key or with any other key", async () => {
      await expectError(await post({ brand: "Saie", category: "Cleanser" }), 400);
      await expectError(await post({ name: "Dew", category: "Cleanser" }), 400);
      await expectError(await post({ name: "Dew", brand: "Saie" }), 400);
      await expectError(await post({ ...newProduct, id: 4 }), 400);
      await expectError(await post({ ...newProduct, usesThisMonth: 3 }), 400);
    });

    // @spec PROD-API-008
    it("rejects a PUT missing a required key or with any other key", async () => {
      await expectError(await put({ name: "Dew", brand: "Saie", category: "Cleanser" }), 400);
      await expectError(await put({ id: 0, brand: "Saie", category: "Cleanser" }), 400);
      await expectError(await put({ id: 0, name: "Dew", category: "Cleanser" }), 400);
      await expectError(await put({ id: 0, name: "Dew", brand: "Saie" }), 400);
      await expectError(await put({ ...changes, usesThisMonth: 3 }), 400);
      await expectError(await put({ ...changes, uses: {} }), 400);
    });

    // @spec PROD-API-009
    it("rejects a name or brand that is not a string, is blank, or has surrounding whitespace", async () => {
      for (const bad of ["", "   ", " Dew", "Dew ", 3, null]) {
        await expectError(await post({ ...newProduct, name: bad }), 400);
        await expectError(await post({ ...newProduct, brand: bad }), 400);
        await expectError(await put({ ...changes, name: bad }), 400);
        await expectError(await put({ ...changes, brand: bad }), 400);
      }
    });

    // @spec PROD-API-010
    it("rejects a category that is not configured, matching its spelling exactly", async () => {
      await expectError(await post({ ...newProduct, category: "Moisturizer" }), 400);
      await expectError(await post({ ...newProduct, category: "cleanser" }), 400);
      await expectError(await put({ ...changes, category: "Moisturizer" }), 400);
    });

    // @spec PROD-API-010
    it("rejects every category when none are configured", async () => {
      await writeData("configs.json", { routines: {} });
      await expectError(await post(newProduct), 400);
    });

    // @spec PROD-API-011
    it("rejects a PUT id that is not an integer matching a product", async () => {
      await expectError(await put({ ...changes, id: 99 }), 400);
      await expectError(await put({ ...changes, id: "0" }), 400);
      await expectError(await put({ ...changes, id: 0.5 }), 400);
      await expectError(await put({ ...changes, id: null }), 400);
    });

    // @spec PROD-API-012
    it("rejects a body that is not valid JSON or not an object", async () => {
      for (const method of ["POST", "PUT"] as const) {
        await expectError(await send(method, "{not json"), 400);
        await expectError(await send(method, "[]"), 400);
        await expectError(await send(method, "null"), 400);
        await expectError(await send(method, '"text"'), 400);
      }
    });

    // @spec PROD-API-013
    it("responds 400 with an error message on validation failure", async () => {
      await expectError(await post({ ...newProduct, category: "Moisturizer" }), 400);
    });

    // @spec PROD-API-014
    it("leaves usage.json unchanged on validation failure", async () => {
      await post({ ...newProduct, name: "" });
      await put({ ...changes, id: 99 });
      await send("POST", "{not json");
      expect(await readData("usage.json")).toEqual(sampleUsage);
    });
  });

  describe("other methods", () => {
    // @spec PROD-API-018
    it.each(["PATCH", "DELETE"] as const)("responds 405 with an error message to %s", async (method) => {
      await expectError(await send(method, JSON.stringify(changes)), 405);
    });

    // @spec PROD-API-019
    it.each(["PATCH", "DELETE"] as const)("leaves usage.json unchanged on %s", async (method) => {
      // A body that POST would accept, so only the method can be what stops the write.
      await send(method, JSON.stringify(newProduct));
      expect(await readData("usage.json")).toEqual(sampleUsage);
    });
  });

  describe("storage failures", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    // @spec PROD-API-015
    it("responds 500 when configs.json cannot be read", async () => {
      await rm(`${dataDir()}/configs.json`);
      await expectError(await post(newProduct), 500);
      await expectError(await put(changes), 500);
    });

    // @spec PROD-API-015
    it("responds 500 when usage.json cannot be read", async () => {
      await rm(`${dataDir()}/usage.json`);
      await expectError(await post(newProduct), 500);
      await expectError(await put(changes), 500);
    });

    // @spec PROD-API-015
    it("responds 500 when usage.json cannot be written", async () => {
      await chmod(dataDir(), 0o555);
      try {
        await expectError(await post(newProduct), 500);
        await expectError(await put(changes), 500);
      } finally {
        await chmod(dataDir(), 0o755);
      }
    });

    // @spec PROD-API-016
    it("leaves usage.json unchanged when it cannot be written", async () => {
      await chmod(dataDir(), 0o555);
      try {
        await post(newProduct);
        await put(changes);
      } finally {
        await chmod(dataDir(), 0o755);
      }
      expect(await readData("usage.json")).toEqual(sampleUsage);
    });

    // @spec PROD-API-016
    it("leaves usage.json unchanged when configs.json cannot be read", async () => {
      await rm(`${dataDir()}/configs.json`);
      await post(newProduct);
      await put(changes);
      expect(await readData("usage.json")).toEqual(sampleUsage);
    });
  });
});
