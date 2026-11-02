import { getFile, modifyFile } from "@/utils/files.server";
import type { ItemUsage } from "./types";

/** The server's current local month as `YYYY-MM`. */
function thisMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Logs and returns false if any record's currentMonth is missing or not `YYYY-MM`. */
// @spec USAGE-ROLL-007
export function hasValidMonths(usage: ItemUsage[]) {
  const bad = usage.find((record) => !/^\d{4}-\d{2}$/.test(String(record.currentMonth ?? "")));
  if (bad) console.error(`Error reading usage.json: product ${bad.id} has no valid currentMonth`);
  return bad === undefined;
}

function needsRollover(record: ItemUsage, month: string) {
  return record.currentMonth < month;
}

/** Moves each earlier month's count into its history and starts the current month at 0. */
// @spec USAGE-ROLL-001, USAGE-ROLL-002, USAGE-ROLL-004
export function rollOver(usage: ItemUsage[], month = thisMonth()): ItemUsage[] {
  return usage.map((record) => {
    if (!needsRollover(record, month)) return record;
    const closed = record.uses[record.currentMonth] ?? 0;
    return {
      ...record,
      uses: { ...record.uses, [record.currentMonth]: closed + record.usesThisMonth },
      currentMonth: month,
      usesThisMonth: 0,
    };
  });
}

/**
 * Loads usage.json with rollover applied, saving the rollover first if it changed anything.
 * Returns undefined if usage.json cannot be read or has a record with no valid month;
 * rejects if the rollover cannot be saved.
 */
// @spec USAGE-ROLL-003
export async function loadUsage(): Promise<ItemUsage[] | undefined> {
  const usage: ItemUsage[] | undefined = await getFile("usage.json");
  if (usage === undefined || !hasValidMonths(usage)) return undefined;

  const month = thisMonth();
  if (!usage.some((record) => needsRollover(record, month))) return usage;
  return modifyFile<ItemUsage[]>("usage.json", (current) => {
    if (!hasValidMonths(current)) throw new Error("usage.json has a record with no valid currentMonth");
    return rollOver(current, month);
  });
}
