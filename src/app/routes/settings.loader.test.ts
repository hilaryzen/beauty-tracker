import { rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dataDir, readRaw, sampleConfigs, settle, writeData } from "@/test/data-dir";
import { loader } from "./settings";

const lastMonth = {
  id: 0,
  name: "Hydro Grip Primer",
  brand: "Milk Makeup",
  category: "Primer",
  uses: {},
  currentMonth: "2026-10",
  usesThisMonth: 2,
};

describe("settings page", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 7));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function expectDataError() {
    const result = await settle(() => loader());
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(500);
    expect(response.statusText).toBe("Your data could not be loaded.");
  }

  // @spec SHELL-SET-003
  it("responds 500 with 'Your data could not be loaded.' when configs.json or usage.json cannot be read", async () => {
    await writeData("usage.json", [lastMonth]);
    await expectDataError();

    await rm(`${dataDir()}/usage.json`);
    await writeData("configs.json", sampleConfigs);
    await expectDataError();
  });

  // @spec SHELL-SET-002
  it("loads the product records and the categories", async () => {
    await writeData("usage.json", [lastMonth]);
    await writeData("configs.json", sampleConfigs);
    expect(await loader()).toEqual({ usage: [lastMonth], categories: sampleConfigs.categories });
  });

  // @spec SHELL-SET-004
  it("does not write usage.json, even when a record has not rolled over", async () => {
    await writeData("usage.json", [lastMonth]);
    await writeData("configs.json", sampleConfigs);
    const before = await readRaw("usage.json");
    await loader();
    expect(await readRaw("usage.json")).toBe(before);
  });
});
