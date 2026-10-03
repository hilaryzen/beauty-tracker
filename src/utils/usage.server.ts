import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { ItemUsage } from '../features/usage/types';

const dataDir = process.env.ENV === 'prod' ? 'data-prod' : 'data';
const usageFile = fileURLToPath(new URL(`../../../assets/${dataDir}/usage.json`, import.meta.url));

export async function getUsage() {
  try {
    // Note: Providing 'utf8' returns a string. Omitting it returns a raw Buffer.
    const data = await readFile(usageFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error handling file:', error instanceof Error ? error.message : String(error));
  }
}

export async function updateUsage(usage: Array<ItemUsage>) {
  try {
    const usageString = JSON.stringify(usage, null, 2)
    await writeFile(usageFile, usageString, 'utf8');
    console.log('File written successfully.');
  } catch (error) {
    console.error('Error handling file:', error instanceof Error ? error.message : String(error));
  }
}