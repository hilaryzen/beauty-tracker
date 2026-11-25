import * as fsPromises from "node:fs/promises";
import { chmod, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dataDir, readData, sampleConfigs, sampleUsage, settle, writeData } from "@/test/data-dir";
import { action, loader } from "./api.categories";
import { action as productsAction } from "./api.products";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, rename: vi.fn(actual.rename) };
});

const actualFs = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");

function send(method: string, rawBody?: string) {
  const request = new Request("http://localhost/api/categories", {
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

type Write = { file: string; data: unknown };

/** Records each data file write, in order, as the contents that land under the file's name. */
function recordWrites() {
  const writes: Write[] = [];
  vi.mocked(fsPromises.rename).mockImplementation(async (from, to) => {
    const data = JSON.parse(await readFile(String(from), "utf8"));
    await actualFs.rename(from, to);
    writes.push({ file: path.basename(String(to)), data });
  });
  return writes;
}

/** Makes the write numbered `failing` (counting from 1) fail. */
function failWrite(failing: number) {
  let count = 0;
  vi.mocked(fsPromises.rename).mockImplementation(async (from, to) => {
    count += 1;
    if (count === failing) throw new Error("disk full");
    await actualFs.rename(from, to);
  });
}

const renamedUsage = sampleUsage.map((product) => (product.category === "Primer" ? { ...product, category: "Base" } : product));

describe("/api/categories", () => {
  beforeEach(async () => {
    vi.mocked(fsPromises.rename).mockImplementation(actualFs.rename);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await writeData("configs.json", sampleConfigs);
    await writeData("usage.json", sampleUsage);
  });

  describe("renaming", () => {
    // @spec PROD-CATAPI-001
    it("replaces the old name with the new one at the same position in its group", async () => {
      await post({ from: "Primer", to: "Base" });
      expect((await readData("configs.json")).categories).toEqual({
        ...sampleConfigs.categories,
        makeup: ["Base", "Foundation"],
      });
    });

    // @spec PROD-CATAPI-002
    it("moves every product using the old name to the new name", async () => {
      await writeData("usage.json", [...sampleUsage, { ...sampleUsage[0], id: 3 }]);
      await post({ from: "Primer", to: "Base" });
      const usage = await readData("usage.json");
      expect(usage.filter((product: { category: string }) => product.category === "Base").map((p: { id: number }) => p.id)).toEqual([0, 3]);
    });

    // @spec PROD-CATAPI-003
    it("leaves every other field and every product in another category unchanged", async () => {
      await post({ from: "Primer", to: "Base" });
      expect(await readData("usage.json")).toEqual(renamedUsage);
    });

    // @spec PROD-CATAPI-004
    it("leaves routines unchanged", async () => {
      await post({ from: "Primer", to: "Base" });
      expect((await readData("configs.json")).routines).toEqual(sampleConfigs.routines);
    });

    // @spec PROD-CATAPI-005
    it("responds with null when the rename completes", async () => {
      expect(await post({ from: "Primer", to: "Base" })).toBeNull();
    });
  });

  describe("write order", () => {
    const bothNames = { ...sampleConfigs.categories, makeup: ["Primer", "Base", "Foundation"] };
    const final = { ...sampleConfigs.categories, makeup: ["Base", "Foundation"] };

    // @spec PROD-CATAPI-006
    it("first configures the new name directly after the old one", async () => {
      const writes = recordWrites();
      await post({ from: "Primer", to: "Base" });
      expect(writes[0]).toEqual({ file: "configs.json", data: { ...sampleConfigs, categories: bothNames } });
    });

    // @spec PROD-CATAPI-007
    it("writes usage.json after the write that configures both names", async () => {
      const writes = recordWrites();
      await post({ from: "Primer", to: "Base" });
      expect(writes[1]).toEqual({ file: "usage.json", data: renamedUsage });
    });

    // @spec PROD-CATAPI-008
    it("removes the old name after usage.json is written, or after the first write when no product uses it", async () => {
      let writes = recordWrites();
      await post({ from: "Primer", to: "Base" });
      expect(writes).toHaveLength(3);
      expect(writes[2]).toEqual({ file: "configs.json", data: { ...sampleConfigs, categories: final } });

      // No product uses Gloss, so the old name is removed straight after the first write.
      await writeData("configs.json", { ...sampleConfigs, categories: { ...sampleConfigs.categories, lips: ["Gloss"] } });
      writes = recordWrites();
      await post({ from: "Gloss", to: "Lip Gloss" });
      expect(writes.map((write) => write.data)).toEqual([
        { ...sampleConfigs, categories: { ...sampleConfigs.categories, lips: ["Gloss", "Lip Gloss"] } },
        { ...sampleConfigs, categories: { ...sampleConfigs.categories, lips: ["Lip Gloss"] } },
      ]);
    });

    // @spec PROD-CATAPI-009
    it("does not write usage.json when no product uses the category", async () => {
      await writeData("configs.json", { ...sampleConfigs, categories: { ...sampleConfigs.categories, lips: ["Gloss"] } });
      const writes = recordWrites();
      await post({ from: "Gloss", to: "Lip Gloss" });
      expect(writes.map((write) => write.file)).toEqual(["configs.json", "configs.json"]);
      expect((await readData("configs.json")).categories.lips).toEqual(["Lip Gloss"]);
    });

    // @spec PROD-CATAPI-010
    it("replaces the name in place, then writes usage.json, for a change of capitalization only", async () => {
      const writes = recordWrites();
      await post({ from: "Primer", to: "primer" });
      expect(writes.map((write) => write.file)).toEqual(["configs.json", "usage.json"]);
      expect(writes[0].data).toEqual({ ...sampleConfigs, categories: { ...sampleConfigs.categories, makeup: ["primer", "Foundation"] } });
      expect((await readData("usage.json"))[0].category).toBe("primer");
    });

    // @spec PROD-CATAPI-011
    it("writes nothing when the new name equals the old one", async () => {
      const writes = recordWrites();
      expect(await post({ from: "Primer", to: "Primer" })).toBeNull();
      expect(writes).toEqual([]);
    });

    // @spec PROD-CATAPI-012
    it("keeps a product save from landing between the rename's steps", async () => {
      // Slow every write, so a product save has time to slip in if the rename does not hold usage.json.
      vi.mocked(fsPromises.rename).mockImplementation(async (from, to) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        await actualFs.rename(from, to);
      });

      const rename = post({ from: "Primer", to: "Base" });
      await new Promise((resolve) => setTimeout(resolve, 30));
      const move = new Request("http://localhost/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 1, name: sampleUsage[1].name, brand: sampleUsage[1].brand, category: "Primer" }),
      });
      await Promise.all([rename, settle(() => productsAction({ request: move } as Parameters<typeof productsAction>[0]))]);

      const configured = Object.values((await readData("configs.json")).categories).flat();
      const usage = await readData("usage.json");
      for (const product of usage) expect(configured).toContain(product.category);
      expect(usage[0].category).toBe("Base");
    });
  });

  describe("validation", () => {
    // @spec PROD-CATAPI-013
    it("rejects a body that is not valid JSON or not a JSON object", async () => {
      await expectError(await send("POST", "{ not json"), 400);
      await expectError(await post([{ from: "Primer", to: "Base" }]), 400);
      await expectError(await post(null), 400);
    });

    // @spec PROD-CATAPI-014
    it("rejects a body missing from or to, or with another key", async () => {
      await expectError(await post({ to: "Base" }), 400);
      await expectError(await post({ from: "Primer" }), 400);
      await expectError(await post({ from: "Primer", to: "Base", group: "makeup" }), 400);
    });

    // @spec PROD-CATAPI-015
    it("rejects a from that is not a configured category", async () => {
      await expectError(await post({ from: "Toner", to: "Base" }), 400);
      await expectError(await post({ from: "primer", to: "Base" }), 400);
      await expectError(await post({ from: 3, to: "Base" }), 400);
    });

    // @spec PROD-CATAPI-016
    it("rejects a to that is blank, not a string, or has surrounding whitespace", async () => {
      for (const to of ["", "   ", " Base", "Base ", 7, null]) {
        await expectError(await post({ from: "Primer", to }), 400);
      }
    });

    // @spec PROD-CATAPI-017
    it("rejects a to that matches another configured category, ignoring capitalization", async () => {
      await expectError(await post({ from: "Primer", to: "Foundation" }), 400);
      await expectError(await post({ from: "Primer", to: "cleanser" }), 400);
    });

    // @spec PROD-CATAPI-018
    it("responds 400 with an error message when validation fails", async () => {
      await expectError(await post({ from: "Primer", to: "Foundation" }), 400);
    });

    // @spec PROD-CATAPI-019
    it("leaves both files unchanged when validation fails", async () => {
      await post({ from: "Primer", to: "Foundation" });
      await post({ from: "Toner", to: "Base" });
      expect(await readData("configs.json")).toEqual(sampleConfigs);
      expect(await readData("usage.json")).toEqual(sampleUsage);
    });
  });

  describe("storage failures", () => {
    // @spec PROD-CATAPI-020
    it("responds 500 when either file cannot be read or a write fails", async () => {
      await rm(`${dataDir()}/usage.json`);
      await expectError(await post({ from: "Primer", to: "Base" }), 500);

      await writeData("usage.json", sampleUsage);
      await rm(`${dataDir()}/configs.json`);
      await expectError(await post({ from: "Primer", to: "Base" }), 500);

      await writeData("configs.json", sampleConfigs);
      await chmod(dataDir(), 0o555);
      try {
        await expectError(await post({ from: "Primer", to: "Base" }), 500);
      } finally {
        await chmod(dataDir(), 0o755);
      }
    });

    // @spec PROD-CATAPI-021
    it("makes none of the later writes when one fails", async () => {
      failWrite(2);
      await expectError(await post({ from: "Primer", to: "Base" }), 500);
      expect((await readData("configs.json")).categories.makeup).toEqual(["Primer", "Base", "Foundation"]);
      expect(await readData("usage.json")).toEqual(sampleUsage);

      await writeData("configs.json", sampleConfigs);
      failWrite(1);
      await expectError(await post({ from: "Primer", to: "Base" }), 500);
      expect(await readData("configs.json")).toEqual(sampleConfigs);
      expect(await readData("usage.json")).toEqual(sampleUsage);
    });
  });

  describe("other methods", () => {
    // @spec PROD-CATAPI-022
    it("responds 405 with an error message to GET", async () => {
      await expectError(await settle(() => loader()), 405);
    });

    // @spec PROD-CATAPI-022
    it.each(["PUT", "PATCH", "DELETE"])("responds 405 with an error message to %s", async (method) => {
      await expectError(await send(method, JSON.stringify({ from: "Primer", to: "Base" })), 405);
    });

    // @spec PROD-CATAPI-023
    it.each(["PUT", "PATCH", "DELETE"])("leaves both files unchanged on %s", async (method) => {
      await send(method, JSON.stringify({ from: "Primer", to: "Base" }));
      expect(await readData("configs.json")).toEqual(sampleConfigs);
      expect(await readData("usage.json")).toEqual(sampleUsage);
    });
  });
});
