import type { Product } from "./types";

/** Returns a message describing the first rule `categories` breaks, or undefined if it is valid. */
// @spec PROD-CAT-001, PROD-CAT-002, PROD-CAT-003
export function checkCategories(categories: unknown, usage: Product[]): string | undefined {
  if (typeof categories !== "object" || categories === null || Array.isArray(categories)) {
    return "categories must be an object of category groups";
  }

  const seen = new Set<string>();
  for (const [group, names] of Object.entries(categories)) {
    if (!Array.isArray(names)) return `Category group "${group}" must be a list of category names`;
    for (const name of names) {
      if (typeof name !== "string" || name === "") {
        return `Category group "${group}" contains an invalid category name`;
      }
      if (seen.has(name)) return `Category "${name}" appears more than once`;
      seen.add(name);
    }
  }

  const missing = usage.find((product) => !seen.has(product.category));
  if (missing) return `Category "${missing.category}" is still used by ${missing.name}`;
}
