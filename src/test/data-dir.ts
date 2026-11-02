import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ItemUsage } from "@/features/usage/types";

export const sampleUsage: ItemUsage[] = [
  {
    id: 0,
    name: "Hydro Grip Primer",
    brand: "Milk Makeup",
    category: "Primer",
    uses: { "2026-09": 25 },
    currentMonth: "2026-10",
    usesThisMonth: 2,
  },
  {
    id: 1,
    name: "Cushion Glass Original",
    brand: "fwee",
    category: "Foundation",
    uses: { "2026-09": 17 },
    currentMonth: "2026-10",
    usesThisMonth: 0,
  },
  {
    id: 2,
    name: "Blueberry Bounce Gentle Cleanser",
    brand: "Glow Recipe",
    category: "Cleanser",
    uses: {},
    currentMonth: "2026-10",
    usesThisMonth: 1,
  },
];

export const sampleConfigs = {
  categories: {
    skincare: ["Cleanser"],
    makeup: ["Primer", "Foundation"],
    lips: [],
  },
  routines: {
    "Morning Skincare": [2],
    Makeup: [0, 1],
  },
};

// The data folder for the current test (emptied before each test by setup.ts).
export function dataDir() {
  return process.env.DATA_DIR!;
}

export async function writeData(name: string, data: unknown) {
  await writeFile(path.join(dataDir(), name), JSON.stringify(data, null, 2), "utf8");
}

export async function readRaw(name: string) {
  return readFile(path.join(dataDir(), name), "utf8");
}

export async function readData(name: string) {
  return JSON.parse(await readRaw(name));
}

// Loaders and actions may either return or throw a Response.
export async function settle(fn: () => unknown): Promise<unknown> {
  try {
    return await fn();
  } catch (thrown) {
    return thrown;
  }
}
