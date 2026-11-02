import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { action } from "@/app/routes/api.configs";
import { loader as homeLoader } from "@/app/routes/home";
import { readData, sampleConfigs, sampleUsage, settle, writeData } from "@/test/data-dir";

function postRoutines(routines: unknown) {
  const request = new Request("http://localhost/api/configs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ routines }),
  });
  return settle(() => action({ request } as Parameters<typeof action>[0]));
}

function status(result: unknown) {
  return result instanceof Response ? result.status : 200;
}

beforeEach(async () => {
  await writeData("configs.json", sampleConfigs);
  await writeData("usage.json", sampleUsage);
});

describe("routine definition", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 26));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // @spec ROUT-001
  it("reads routines from the routines key of configs.json", async () => {
    const data = await homeLoader();
    expect((data as { routines: unknown }).routines).toEqual(sampleConfigs.routines);
  });
});

describe("routine rules for /api/configs", () => {
  // @spec ROUT-VAL-001
  it("accepts an object of integer arrays, including no routines, and rejects other shapes", async () => {
    expect(status(await postRoutines({ Evening: [0, 2] }))).not.toBe(400);
    expect((await readData("configs.json")).routines).toEqual({ Evening: [0, 2] });
    expect(status(await postRoutines({}))).not.toBe(400);

    expect(status(await postRoutines([[0]]))).toBe(400);
    expect(status(await postRoutines({ Evening: "0" }))).toBe(400);
    expect(status(await postRoutines({ Evening: [0.5] }))).toBe(400);
  });

  // @spec ROUT-VAL-002
  it("rejects a routine name that is empty or only whitespace", async () => {
    expect(status(await postRoutines({ "": [0] }))).toBe(400);
    expect(status(await postRoutines({ "   ": [0] }))).toBe(400);
  });

  // @spec ROUT-VAL-003
  it("rejects a routine with no products", async () => {
    expect(status(await postRoutines({ Evening: [] }))).toBe(400);
  });

  // @spec ROUT-VAL-004
  it("rejects a routine that lists the same product twice", async () => {
    expect(status(await postRoutines({ Evening: [0, 0] }))).toBe(400);
  });

  // @spec ROUT-VAL-005
  it("rejects a product id that matches no product in usage.json", async () => {
    expect(status(await postRoutines({ Evening: [0, 99] }))).toBe(400);
    expect(await readData("configs.json")).toEqual(sampleConfigs);
  });

  // @spec ROUT-VAL-006
  it("rejects a routine name that starts or ends with whitespace", async () => {
    expect(status(await postRoutines({ " Evening": [0] }))).toBe(400);
    expect(status(await postRoutines({ "Evening ": [0] }))).toBe(400);
  });
});
