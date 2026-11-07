import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleConfigs, sampleUsage, settle, writeData } from "@/test/data-dir";
import { loader } from "./home";

describe("home page", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 26));
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

  // @spec SHELL-HOME-002
  it("responds 500 with 'Your data could not be loaded.' when configs.json or usage.json cannot be read", async () => {
    await writeData("usage.json", sampleUsage);
    await expectDataError();

    const { rm } = await import("node:fs/promises");
    await rm(`${process.env.DATA_DIR}/usage.json`);
    await writeData("configs.json", sampleConfigs);
    await expectDataError();
  });
});
