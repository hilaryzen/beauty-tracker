import "@testing-library/jest-dom/vitest";
import { chmodSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, vi } from "vitest";

// Every test runs against an empty throwaway data folder, so no test can
// touch src/assets/data* or see files left by an earlier test.
const defaultDataDir = mkdtempSync(path.join(tmpdir(), "beauty-tracker-"));
process.env.DATA_DIR = defaultDataDir;

beforeEach(() => {
  process.env.DATA_DIR = defaultDataDir;
  // A failed test may have left the folder read-only.
  chmodSync(defaultDataDir, 0o755);
  rmSync(defaultDataDir, { recursive: true, force: true });
  mkdirSync(defaultDataDir);
});

afterAll(() => {
  rmSync(defaultDataDir, { recursive: true, force: true });
});

// Refuse to run if the data store no longer honors DATA_DIR.
const files: { getDataDir?: () => string } = await import("@/utils/files.server");
const redirected = files.getDataDir?.() === defaultDataDir;
vi.resetModules();

if (!redirected) {
  throw new Error(
    "Test safety check failed: the data store ignores DATA_DIR, so tests would write to real data files.",
  );
}
