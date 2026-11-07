import type { Product } from "@/features/products/types";

/** Returns a message describing the first rule `routines` breaks, or undefined if it is valid. */
// @spec ROUT-VAL-001, ROUT-VAL-002, ROUT-VAL-003, ROUT-VAL-004, ROUT-VAL-005, ROUT-VAL-006
export function checkRoutines(routines: unknown, usage: Product[]): string | undefined {
  if (typeof routines !== "object" || routines === null || Array.isArray(routines)) {
    return "routines must be an object of routines";
  }

  const productIds = new Set(usage.map((product) => product.id));
  for (const [name, ids] of Object.entries(routines)) {
    if (name.trim() === "") return "Routine names cannot be blank";
    if (name !== name.trim()) return `Routine name "${name}" cannot start or end with spaces`;
    if (!Array.isArray(ids) || !ids.every(Number.isInteger)) {
      return `Routine "${name}" must be a list of product ids`;
    }
    if (ids.length === 0) return `Routine "${name}" has no products`;
    if (new Set(ids).size !== ids.length) return `Routine "${name}" lists a product more than once`;
    const unknown = ids.find((id) => !productIds.has(id));
    if (unknown !== undefined) return `Routine "${name}" lists unknown product id ${unknown}`;
  }
}
