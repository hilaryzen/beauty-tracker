import { chmod } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loader as homeLoader } from "@/app/routes/home";
import { action as usageAction, loader as usageLoader } from "@/app/routes/api.usage";
import { dataDir, readData, sampleConfigs, settle, writeData } from "@/test/data-dir";
import { loadUsage } from "./usage.server";

const october = {
  id: 0,
  name: "Hydro Grip Primer",
  brand: "Milk Makeup",
  category: "Primer",
  uses: { "2026-09": 25, "2026-10": 3 },
  currentMonth: "2026-10",
  usesThisMonth: 2,
};

const december = { ...october, id: 1, uses: {}, currentMonth: "2026-12", usesThisMonth: 4 };

async function withReadOnlyDataDir<T>(fn: () => Promise<T>) {
  await chmod(dataDir(), 0o555);
  try {
    return await fn();
  } finally {
    await chmod(dataDir(), 0o755);
  }
}

describe("month rollover", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 3)); // 3 November 2026, local time
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // @spec USAGE-ROLL-001
  it("adds an earlier month's count into that month's history when usage data is loaded", async () => {
    await writeData("usage.json", [october]);
    const [record] = (await loadUsage())!;
    expect(record.uses).toEqual({ "2026-09": 25, "2026-10": 5 });
  });

  // @spec USAGE-ROLL-002
  it("resets the count to 0 and moves the record to the current month", async () => {
    await writeData("usage.json", [october]);
    const [record] = (await loadUsage())!;
    expect(record.usesThisMonth).toBe(0);
    expect(record.currentMonth).toBe("2026-11");
  });

  // @spec USAGE-ROLL-003
  it("writes usage.json when rollover changed a record", async () => {
    await writeData("usage.json", [october]);
    await loadUsage();
    const [saved] = await readData("usage.json");
    expect(saved.currentMonth).toBe("2026-11");
    expect(saved.uses["2026-10"]).toBe(5);
  });

  // @spec USAGE-ROLL-004
  it("leaves a record whose current month is equal to or later than the server's month unchanged", async () => {
    const november = { ...october, id: 2, currentMonth: "2026-11" };
    await writeData("usage.json", [november, december]);
    const records = (await loadUsage())!;
    expect(records).toEqual([november, december]);
  });

  // @spec USAGE-ROLL-005
  it("fails the home page load when the rollover write fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await writeData("usage.json", [october]);
    await writeData("configs.json", sampleConfigs);
    const result = await withReadOnlyDataDir(() =>
      settle(() => homeLoader()),
    );
    // A thrown Error (not a data response) reaches the error page.
    expect(result).toBeInstanceOf(Error);
  });

  // @spec USAGE-ROLL-005, STORE-009
  it("retries rollover on the next load after a failed rollover write", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await writeData("usage.json", [october]);
    await writeData("configs.json", sampleConfigs);

    await withReadOnlyDataDir(() => settle(() => homeLoader()));
    expect(await readData("usage.json")).toEqual([october]);

    await homeLoader();
    const [saved] = await readData("usage.json");
    expect(saved.currentMonth).toBe("2026-11");
    expect(saved.uses["2026-10"]).toBe(5);
  });

  // @spec USAGE-ROLL-006
  it("responds 500 to GET /api/usage when the rollover write fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await writeData("usage.json", [october]);
    const result = await withReadOnlyDataDir(() =>
      settle(() => usageLoader()),
    );
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(500);
    expect(typeof (await response.json()).error).toBe("string");
  });

  // @spec USAGE-ROLL-007
  it("treats usage.json as unreadable when a record's current month is missing or malformed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { currentMonth: _, ...noMonth } = october;
    for (const bad of [noMonth, { ...october, currentMonth: "Oct" }, { ...october, currentMonth: "2026-1" }]) {
      await writeData("usage.json", [bad, december]);
      expect(await loadUsage()).toBeUndefined();

      const get = await settle(() => usageLoader());
      expect((get as Response).status).toBe(500);

      const request = new Request("http://localhost/api/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [1], delta: 1 }),
      });
      const post = await settle(() => usageAction({ request } as Parameters<typeof usageAction>[0]));
      expect((post as Response).status).toBe(500);
      expect(await readData("usage.json")).toEqual([bad, december]);
    }
  });
});
