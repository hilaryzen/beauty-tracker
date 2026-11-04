import { beforeEach, describe, expect, it } from "vitest";
import { action } from "@/app/routes/api.configs";
import { readData, sampleConfigs, sampleUsage, settle, writeData } from "@/test/data-dir";

function postCategories(categories: unknown) {
  const request = new Request("http://localhost/api/configs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categories }),
  });
  return settle(() => action({ request } as Parameters<typeof action>[0]));
}

function status(result: unknown) {
  return result instanceof Response ? result.status : 200;
}

describe("category rules for /api/configs", () => {
  beforeEach(async () => {
    await writeData("configs.json", sampleConfigs);
    await writeData("usage.json", sampleUsage);
  });

  // @spec USAGE-CAT-001
  it("accepts an object of string arrays, including empty groups, and rejects other shapes", async () => {
    const valid = { skincare: ["Cleanser"], makeup: ["Primer", "Foundation"], hair: [] };
    expect(status(await postCategories(valid))).not.toBe(400);
    expect((await readData("configs.json")).categories).toEqual(valid);

    expect(status(await postCategories(["Cleanser"]))).toBe(400);
    expect(status(await postCategories({ skincare: "Cleanser" }))).toBe(400);
    expect(status(await postCategories({ skincare: [""] }))).toBe(400);
    expect(status(await postCategories({ skincare: [3] }))).toBe(400);
  });

  // @spec USAGE-CAT-002
  it("rejects a category name that appears in more than one place", async () => {
    const duplicated = { skincare: ["Cleanser", "Primer"], makeup: ["Primer", "Foundation"] };
    expect(status(await postCategories(duplicated))).toBe(400);
  });

  // @spec USAGE-CAT-003
  it("rejects removing a category that a product still uses", async () => {
    // "Cleanser" is used by sampleUsage product 2.
    const withoutCleanser = { skincare: [], makeup: ["Primer", "Foundation"] };
    expect(status(await postCategories(withoutCleanser))).toBe(400);
    expect(await readData("configs.json")).toEqual(sampleConfigs);
  });
});
