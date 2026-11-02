import { existsSync } from "node:fs";
import * as fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readData, readRaw, dataDir, writeData } from "@/test/data-dir";
import { getDataDir, getFile, modifyFile, updateFile } from "./files.server";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    writeFile: vi.fn(actual.writeFile),
    rename: vi.fn(actual.rename),
  };
});

const assetsDir = fileURLToPath(new URL("../assets", import.meta.url));

describe("data folder", () => {
  const savedEnv = process.env.ENV;
  const savedDataDir = process.env.DATA_DIR;

  afterEach(() => {
    if (savedEnv === undefined) delete process.env.ENV;
    else process.env.ENV = savedEnv;
    process.env.DATA_DIR = savedDataDir;
  });

  // @spec STORE-001
  it("uses data-prod when ENV is prod and DATA_DIR is unset", () => {
    delete process.env.DATA_DIR;
    process.env.ENV = "prod";
    expect(getDataDir()).toBe(path.join(assetsDir, "data-prod"));
  });

  // @spec STORE-002
  it("uses data when ENV is not prod and DATA_DIR is unset", () => {
    delete process.env.DATA_DIR;
    delete process.env.ENV;
    expect(getDataDir()).toBe(path.join(assetsDir, "data"));
  });

  // @spec STORE-001, STORE-002
  it("finds the data folders under the folder the server is started from, wherever the module is bundled", () => {
    delete process.env.DATA_DIR;
    const cwd = vi.spyOn(process, "cwd").mockReturnValue("/srv/beauty-tracker");
    try {
      process.env.ENV = "prod";
      expect(getDataDir()).toBe(path.join("/srv/beauty-tracker", "src/assets/data-prod"));
      delete process.env.ENV;
      expect(getDataDir()).toBe(path.join("/srv/beauty-tracker", "src/assets/data"));
    } finally {
      cwd.mockRestore();
    }
  });

  // @spec STORE-011
  it("uses DATA_DIR when set, regardless of ENV", () => {
    process.env.ENV = "prod";
    process.env.DATA_DIR = "/tmp/somewhere";
    expect(getDataDir()).toBe("/tmp/somewhere");
  });
});

describe("file access", () => {
  afterEach(() => {
    vi.mocked(fsPromises.writeFile).mockClear();
    vi.mocked(fsPromises.rename).mockClear();
    vi.restoreAllMocks();
  });

  // @spec STORE-003
  it("returns a data file's contents parsed as JSON", async () => {
    await writeData("configs.json", { routines: { A: [1] } });
    expect(await getFile("configs.json")).toEqual({ routines: { A: [1] } });
  });

  // @spec STORE-004
  it("logs and returns no data when a file is missing or not JSON", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getFile("missing.json")).toBeUndefined();

    await fsPromises.writeFile(path.join(dataDir(), "bad.json"), "{ not json", "utf8");
    expect(await getFile("bad.json")).toBeUndefined();
    expect(error).toHaveBeenCalledTimes(2);
  });

  // @spec STORE-005
  it("replaces the whole file with 2-space-indented JSON", async () => {
    await writeData("configs.json", { old: true, extra: [1, 2, 3] });
    await updateFile("configs.json", { routines: {} });
    expect(await readRaw("configs.json")).toBe(
      JSON.stringify({ routines: {} }, null, 2),
    );
  });

  // @spec STORE-006
  it("lives in a .server.ts module so it never ships to the browser", () => {
    expect(existsSync(fileURLToPath(new URL("./files.server.ts", import.meta.url)))).toBe(true);
  });

  // @spec STORE-007
  it("logs and raises a write failure to the caller", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const folder = dataDir();
    process.env.DATA_DIR = path.join(folder, "does-not-exist");
    try {
      await expect(updateFile("configs.json", {})).rejects.toThrow();
      expect(error).toHaveBeenCalled();
    } finally {
      process.env.DATA_DIR = folder;
    }
  });

  // @spec STORE-008
  it("writes to a temporary file in the same folder, then renames it over the target", async () => {
    await updateFile("configs.json", { routines: {} });

    const target = path.join(dataDir(), "configs.json");
    const [[tempPath]] = vi.mocked(fsPromises.writeFile).mock.calls as unknown as [[string]];
    expect(path.dirname(String(tempPath))).toBe(dataDir());
    expect(String(tempPath)).not.toBe(target);
    expect(fsPromises.rename).toHaveBeenCalledWith(tempPath, target);
  });

  // @spec STORE-009
  it("keeps the previous contents when writing fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await writeData("configs.json", { routines: { Keep: [1] } });

    vi.mocked(fsPromises.writeFile).mockRejectedValueOnce(new Error("disk full"));
    await expect(updateFile("configs.json", { routines: {} })).rejects.toThrow();
    expect(await readData("configs.json")).toEqual({ routines: { Keep: [1] } });

    vi.mocked(fsPromises.rename).mockRejectedValueOnce(new Error("rename failed"));
    await expect(updateFile("configs.json", { routines: {} })).rejects.toThrow();
    expect(await readData("configs.json")).toEqual({ routines: { Keep: [1] } });
  });

  // @spec STORE-010
  it("runs overlapping read-change-write updates to one file one at a time", async () => {
    await writeData("counter.json", { n: 0 });
    const increment = async (current: { n: number }) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { n: current.n + 1 };
    };

    await Promise.all([
      modifyFile("counter.json", increment),
      modifyFile("counter.json", increment),
      modifyFile("counter.json", increment),
    ]);

    expect(await readData("counter.json")).toEqual({ n: 3 });
  });

  // @spec STORE-012
  it("waits for a pending read-change-write update before a plain write to the same file", async () => {
    await writeData("counter.json", { n: 0 });
    const slowIncrement = async (current: { n: number }) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { n: current.n + 1 };
    };

    await Promise.all([
      modifyFile("counter.json", slowIncrement),
      updateFile("counter.json", { n: 100 }),
    ]);

    expect(await readData("counter.json")).toEqual({ n: 100 });
  });
});
