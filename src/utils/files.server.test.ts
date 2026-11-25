import { existsSync } from "node:fs";
import * as fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readData, readRaw, dataDir, writeData } from "@/test/data-dir";
import { getDataDir, getFile, modifyFile, modifyFiles, updateFile } from "./files.server";

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

describe("multi-file updates", () => {
  const pause = (ms = 15) => new Promise((resolve) => setTimeout(resolve, ms));

  // @spec STORE-013
  it("starts its task only after earlier updates to every named file have finished", async () => {
    await writeData("a.json", { n: 0 });
    await writeData("b.json", { n: 0 });
    const slowIncrement = async (current: { n: number }) => {
      await pause();
      return { n: current.n + 1 };
    };

    const earlierA = modifyFile("a.json", slowIncrement);
    const earlierB = modifyFile("b.json", slowIncrement);
    const seen = await modifyFiles(["a.json", "b.json"], async ({ read }) => [
      await read<{ n: number }>("a.json"),
      await read<{ n: number }>("b.json"),
    ]);
    await Promise.all([earlierA, earlierB]);

    expect(seen).toEqual([{ n: 1 }, { n: 1 }]);
  });

  // @spec STORE-014
  it("starts no other update to a named file while its task runs", async () => {
    await writeData("a.json", { n: 0 });
    await writeData("b.json", { n: 0 });

    const multi = modifyFiles(["a.json", "b.json"], async ({ read, write }) => {
      const b = await read<{ n: number }>("b.json");
      await pause();
      await write("b.json", { n: b.n + 10 });
      const a = await read<{ n: number }>("a.json");
      await pause();
      await write("a.json", { n: a.n + 10 });
    });
    const laterA = modifyFile("a.json", (current: { n: number }) => ({ n: current.n + 1 }));
    const laterB = updateFile("b.json", { n: 100 });
    await Promise.all([multi, laterA, laterB]);

    expect(await readData("a.json")).toEqual({ n: 11 });
    expect(await readData("b.json")).toEqual({ n: 100 });
  });

  // @spec STORE-015
  it("completes overlapping multi-file updates that name the same files in different orders", async () => {
    await writeData("a.json", { log: [] });
    await writeData("b.json", { log: [] });
    const append = (label: string) => async ({ read, write }: Parameters<Parameters<typeof modifyFiles>[1]>[0]) => {
      for (const name of ["b.json", "a.json"]) {
        const current = await read<{ log: string[] }>(name);
        await pause(5);
        await write(name, { log: [...current.log, label] });
      }
    };

    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("updates never finished")), 1000));
    await Promise.race([
      Promise.all([
        modifyFiles(["b.json", "a.json"], append("first")),
        modifyFiles(["a.json", "b.json"], append("second")),
      ]),
      timeout,
    ]);

    expect(await readData("a.json")).toEqual({ log: ["first", "second"] });
    expect(await readData("b.json")).toEqual({ log: ["first", "second"] });
  });

  // @spec STORE-016
  it("rejects when the task fails and keeps what the task already wrote", async () => {
    await writeData("a.json", { n: 0 });
    await writeData("b.json", { n: 0 });

    const update = modifyFiles(["a.json", "b.json"], async ({ write }) => {
      await write("a.json", { n: 1 });
      throw new Error("stopped partway");
    });

    await expect(update).rejects.toThrow("stopped partway");
    expect(await readData("a.json")).toEqual({ n: 1 });
    expect(await readData("b.json")).toEqual({ n: 0 });
  });

  // @spec STORE-017
  it("rejects reading or writing a file the update did not name", async () => {
    await writeData("a.json", { n: 0 });
    await writeData("c.json", { n: 0 });

    await modifyFiles(["a.json"], async ({ read, write }) => {
      await expect(read("c.json")).rejects.toThrow();
      await expect(write("c.json", { n: 1 })).rejects.toThrow();
    });

    expect(await readData("c.json")).toEqual({ n: 0 });
  });

  // @spec STORE-018
  it("rejects reading a named file that is missing or not JSON", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await fsPromises.writeFile(path.join(dataDir(), "bad.json"), "{ not json", "utf8");

    await modifyFiles(["bad.json", "missing.json"], async ({ read }) => {
      await expect(read("missing.json")).rejects.toThrow();
      await expect(read("bad.json")).rejects.toThrow();
    });
  });
});
