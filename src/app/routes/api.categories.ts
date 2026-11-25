import type { Route } from "./+types/api.categories";
import { isCleanName } from "@/features/products/category-rules";
import type { Product } from "@/features/products/types";
import type { Categories } from "@/features/products/use-product-editor";
import { modifyFiles } from "@/utils/files.server";

class ValidationError extends Error {}

type Configs = { categories?: Categories } & Record<string, unknown>;
type Rename = { from: string; to: string };

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function sameName(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

/** Returns a message describing the first problem with the body, or undefined if it is valid. */
// @spec PROD-CATAPI-013, PROD-CATAPI-014, PROD-CATAPI-015, PROD-CATAPI-016, PROD-CATAPI-017
function validate(body: unknown, categories: Categories): string | undefined {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "The request body must be an object";
  }
  const unknownKey = Object.keys(body).find((key) => key !== "from" && key !== "to");
  if (unknownKey) return `Unknown field "${unknownKey}"`;

  const { from, to } = body as Record<string, unknown>;
  if (from === undefined) return "from is required";
  if (to === undefined) return "to is required";
  const configured = Object.values(categories).flat();
  if (typeof from !== "string" || !configured.includes(from)) return `Category "${String(from)}" is not configured`;
  if (!isCleanName(to)) return "to must not be blank or start or end with spaces";
  const clash = configured.find((name) => name !== from && sameName(name, to as string));
  if (clash) return `Category "${clash}" already exists`;
}

/** The categories with `change` applied to the group holding `from`, every other group unchanged. */
function editGroupOf(categories: Categories, from: string, change: (names: string[]) => string[]): Categories {
  return Object.fromEntries(
    Object.entries(categories).map(([group, names]) => [group, names.includes(from) ? change(names) : names]),
  );
}

/**
 * Renames a category in configs.json and in every product using it. Every write leaves valid data:
 * the new name is configured beside the old one, then products move, then the old name goes.
 * A change of capitalization alone cannot hold both names, so it is replaced in place first.
 */
// @spec PROD-CATAPI-001, PROD-CATAPI-002, PROD-CATAPI-003, PROD-CATAPI-004, PROD-CATAPI-006, PROD-CATAPI-007, PROD-CATAPI-008, PROD-CATAPI-009, PROD-CATAPI-010, PROD-CATAPI-011, PROD-CATAPI-012, PROD-CATAPI-021
async function rename(body: unknown) {
  await modifyFiles(["configs.json", "usage.json"], async ({ read, write }) => {
    const configs = await read<Configs>("configs.json");
    const usage = await read<Product[]>("usage.json");
    const categories = configs.categories ?? {};
    const error = validate(body, categories);
    if (error) throw new ValidationError(error);

    const { from, to } = body as Rename;
    if (from === to) return;
    const used = usage.some((product) => product.category === from);
    const movedUsage = () => usage.map((product) => (product.category === from ? { ...product, category: to } : product));
    const replaced = editGroupOf(categories, from, (names) => names.map((name) => (name === from ? to : name)));

    if (sameName(from, to)) {
      await write("configs.json", { ...configs, categories: replaced });
      if (used) await write("usage.json", movedUsage());
      return;
    }

    const bothNames = editGroupOf(categories, from, (names) => names.flatMap((name) => (name === from ? [from, to] : [name])));
    await write("configs.json", { ...configs, categories: bothNames });
    if (used) await write("usage.json", movedUsage());
    await write("configs.json", { ...configs, categories: replaced });
  });
}

// @spec PROD-CATAPI-022
export function loader() {
  return errorResponse("Method not allowed", 405);
}

// @spec PROD-CATAPI-005, PROD-CATAPI-018, PROD-CATAPI-019, PROD-CATAPI-020, PROD-CATAPI-022, PROD-CATAPI-023
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") return errorResponse("Method not allowed", 405);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("The request body must be JSON", 400);
  }

  try {
    await rename(body);
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, 400);
    console.error("Error renaming a category:", error instanceof Error ? error.message : String(error));
    return errorResponse("The category could not be renamed.", 500);
  }
  return null;
}
