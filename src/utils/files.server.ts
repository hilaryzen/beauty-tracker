import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

// @spec STORE-001, STORE-002, STORE-011
export function getDataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  const dataDir = process.env.ENV === 'prod' ? 'data-prod' : 'data';
  // Relative to where the server starts (the project folder), not this module, which a build moves.
  return path.join(process.cwd(), 'src/assets', dataDir);
}

function filePath(fileName: string) {
  return `${getDataDir()}/${fileName}`;
}

// @spec STORE-003, STORE-004, STORE-006
export async function getFile(fileName: string) {
  try {
    const data = await readFile(filePath(fileName), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error instanceof Error ? error.message : String(error));
  }
}

// @spec STORE-005, STORE-007, STORE-008, STORE-009
async function writeAtomically(fileName: string, data: unknown) {
  const target = filePath(fileName);
  const temp = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(data, null, 2), 'utf8');
    await rename(temp, target);
  } catch (error) {
    console.error(`Error writing ${fileName}:`, error instanceof Error ? error.message : String(error));
    await rm(temp, { force: true }).catch(() => {});
    throw error;
  }
}

// Pending work per file path; each task starts after the previous one settles.
const queues = new Map<string, Promise<unknown>>();

function enqueue<T>(fileName: string, task: () => Promise<T>): Promise<T> {
  const key = filePath(fileName);
  const run = (queues.get(key) ?? Promise.resolve()).then(task, task);
  const settled = run.catch(() => {});
  queues.set(key, settled);
  settled.then(() => {
    if (queues.get(key) === settled) queues.delete(key);
  });
  return run;
}

export function updateFile(fileName: string, data: unknown) {
  return enqueue(fileName, () => writeAtomically(fileName, data));
}

/**
 * Reads a data file, passes its contents to `change`, and writes back what `change` returns,
 * with no other update to the same file in between. Rejects if the file cannot be read or
 * written; an error thrown by `change` rejects without writing.
 */
// @spec STORE-010
export function modifyFile<T>(fileName: string, change: (current: T) => T | Promise<T>): Promise<T> {
  return enqueue(fileName, async () => {
    const current = await getFile(fileName);
    if (current === undefined) throw new Error(`${fileName} could not be read`);
    const next = await change(current);
    await writeAtomically(fileName, next);
    return next;
  });
}
