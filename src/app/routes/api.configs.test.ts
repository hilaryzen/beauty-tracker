import { chmod } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  readData,
  sampleConfigs,
  sampleUsage,
  settle,
  dataDir,
  writeData,
} from "@/test/data-dir";
import { action, loader } from "./api.configs";

function post(body: unknown) {
  const request = new Request("http://localhost/api/configs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return settle(() => action({ request } as Parameters<typeof action>[0]));
}

async function expectError(result: unknown, status: number) {
  expect(result).toBeInstanceOf(Response);
  const response = result as Response;
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(typeof body.error).toBe("string");
  expect(body.error.length).toBeGreaterThan(0);
}

describe("/api/configs", () => {
  async function seed() {
    await writeData("configs.json", sampleConfigs);
    await writeData("usage.json", sampleUsage);
  }

  // @spec STORE-API-001
  it("returns the full contents of configs.json on GET", async () => {
    await seed();
    const result = await settle(() => loader());
    const data = result instanceof Response ? await result.json() : result;
    expect(data).toEqual(sampleConfigs);
  });

  // @spec STORE-API-002
  it("responds 500 with an error message when configs.json cannot be read on GET", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expectError(await settle(() => loader()), 500);
  });

  // @spec STORE-API-003
  it("replaces only the keys sent and keeps the rest", async () => {
    await seed();
    const routines = { Evening: [1, 2] };
    await post({ routines });
    expect(await readData("configs.json")).toEqual({
      categories: sampleConfigs.categories,
      routines,
    });
  });

  // @spec STORE-API-004
  it("validates categories with usage's rules and routines with routines' rules", async () => {
    await seed();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Duplicate category name across groups (usage rule).
    await expectError(
      await post({ categories: { skincare: ["Primer"], makeup: ["Primer"] } }),
      400,
    );
    // Routine with no products (routines rule).
    await expectError(await post({ routines: { Empty: [] } }), 400);
  });

  // @spec STORE-API-005
  it("responds 400 with an error message when validation fails", async () => {
    await seed();
    await expectError(await post({ routines: { Bad: [99] } }), 400);
  });

  // @spec STORE-API-006
  it("leaves configs.json unchanged when any part fails validation", async () => {
    await seed();
    await post({ categories: { skincare: ["Cleanser", "Toner"] }, routines: { Empty: [] } });
    expect(await readData("configs.json")).toEqual(sampleConfigs);
  });

  // @spec STORE-API-007
  it("rejects a body with a top-level key other than categories and routines", async () => {
    await seed();
    await expectError(await post({ makeupCategories: ["Primer"] }), 400);
    expect(await readData("configs.json")).toEqual(sampleConfigs);
  });

  // @spec STORE-API-008
  it("responds 500 when configs.json or usage.json cannot be read, or configs.json cannot be written", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    // configs.json missing.
    await writeData("usage.json", sampleUsage);
    await expectError(await post({ routines: { A: [0] } }), 500);

    // usage.json missing while routines are validated.
    await writeData("configs.json", sampleConfigs);
    const { rm } = await import("node:fs/promises");
    await rm(`${dataDir()}/usage.json`);
    await expectError(await post({ routines: { A: [0] } }), 500);

    // configs.json cannot be written (read-only folder).
    await writeData("usage.json", sampleUsage);
    await chmod(dataDir(), 0o555);
    try {
      await expectError(await post({ routines: { A: [0] } }), 500);
    } finally {
      await chmod(dataDir(), 0o755);
    }
  });

  // @spec STORE-API-009
  it("leaves configs.json unchanged when a read or the write fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await writeData("configs.json", sampleConfigs);
    // usage.json is missing, so routine validation cannot read it.
    await post({ routines: { A: [0] } });
    expect(await readData("configs.json")).toEqual(sampleConfigs);

    await writeData("usage.json", sampleUsage);
    await chmod(dataDir(), 0o555);
    try {
      await post({ routines: { A: [0] } });
    } finally {
      await chmod(dataDir(), 0o755);
    }
    expect(await readData("configs.json")).toEqual(sampleConfigs);
  });

  // @spec STORE-API-010
  it("rejects a body that is not valid JSON or not a JSON object", async () => {
    await seed();
    const raw = new Request("http://localhost/api/configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    });
    await expectError(await settle(() => action({ request: raw } as Parameters<typeof action>[0])), 400);
    await expectError(await post([{ routines: {} }]), 400);
    await expectError(await post(null), 400);
    expect(await readData("configs.json")).toEqual(sampleConfigs);
  });
});
