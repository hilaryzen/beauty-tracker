import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// @spec STORE-001, STORE-002, STORE-011
export function getDataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  const dataDir = process.env.ENV === 'prod' ? 'data-prod' : 'data';
  return fileURLToPath(new URL(`../assets/${dataDir}`, import.meta.url));
}

export async function getFile(fileName: string) {
  try {
    // Note: Providing 'utf8' returns a string. Omitting it returns a raw Buffer.
    const data = await readFile(`${getDataDir()}/${fileName}`, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error handling file:', error instanceof Error ? error.message : String(error));
  }
}

export async function updateFile(fileName: string, data: any) {
  try {
    const dataString = JSON.stringify(data, null, 2)
    await writeFile(`${getDataDir()}/${fileName}`, dataString, 'utf8');
    console.log('File written successfully.');
  } catch (error) {
    console.error('Error handling file:', error instanceof Error ? error.message : String(error));
  }
}