import type { Route } from "./+types/api.products";
import { isCleanName } from "@/features/products/category-rules";
import type { Product } from "@/features/products/types";
import { getFile, modifyFile } from "@/utils/files.server";
import { thisMonth } from "@/utils/this-month";

class ValidationError extends Error {}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

type ProductFields = Pick<Product, "name" | "brand" | "category">;
type ProductChange = ProductFields & Pick<Product, "id">;

/** Returns a message describing the first problem with the body's shape, or undefined if it is valid. */
// @spec PROD-API-007, PROD-API-008, PROD-API-009, PROD-API-012
function checkShape(body: unknown, requiredKeys: string[]): string | undefined {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "The request body must be an object";
  }
  const unknownKey = Object.keys(body).find((key) => !requiredKeys.includes(key));
  if (unknownKey) return `Unknown field "${unknownKey}"`;

  const fields = body as Record<string, unknown>;
  const missing = requiredKeys.find((key) => fields[key] === undefined);
  if (missing) return `${missing} is required`;
  if (!isCleanName(fields.name)) return "name must not be blank or start or end with spaces";
  if (!isCleanName(fields.brand)) return "brand must not be blank or start or end with spaces";
}

function nextId(usage: Product[]) {
  return Math.max(-1, ...usage.map((record) => record.id)) + 1;
}

/** Appends a new record, with an id one higher than any existing one and no purchase. */
// @spec PROD-API-001, PROD-API-002, PROD-API-003, PROD-API-021
function addProduct(usage: Product[], { name, brand, category }: ProductFields): Product[] {
  const id = nextId(usage);
  return [...usage, { id, name, brand, category, uses: {}, currentMonth: thisMonth(), usesThisMonth: 0 }];
}

/** Replaces the fields the products segment owns, leaving the id, counts, and purchase alone. */
// @spec PROD-002, PROD-API-004, PROD-API-005, PROD-API-011, PROD-API-022
function editProduct(usage: Product[], { id, name, brand, category }: ProductChange): Product[] {
  if (!usage.some((record) => record.id === id)) throw new ValidationError(`No product has id ${id}`);
  return usage.map((record) => (record.id === id ? { ...record, name, brand, category } : record));
}

// @spec PROD-API-006, PROD-API-010, PROD-API-013, PROD-API-014, PROD-API-015, PROD-API-016, PROD-API-017, PROD-API-018, PROD-API-019, PROD-API-020
export async function action({ request }: Route.ActionArgs) {
  const isEdit = request.method === "PUT";
  if (!isEdit && request.method !== "POST") return errorResponse("Method not allowed", 405);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("The request body must be JSON", 400);
  }
  const shapeError = checkShape(body, isEdit ? ["id", "name", "brand", "category"] : ["name", "brand", "category"]);
  if (shapeError) return errorResponse(shapeError, 400);

  try {
    const configs = await getFile("configs.json");
    if (configs === undefined) throw new Error("configs.json could not be read");
    const { category } = body as ProductFields;
    if (!Object.values<string[]>(configs.categories ?? {}).flat().includes(category)) {
      return errorResponse(`Category "${category}" is not configured`, 400);
    }

    let addedId: number | undefined;
    await modifyFile<Product[]>("usage.json", (usage) => {
      if (isEdit) return editProduct(usage, body as ProductChange);
      addedId = nextId(usage);
      return addProduct(usage, body as ProductFields);
    });
    if (addedId !== undefined) return Response.json({ id: addedId });
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, 400);
    console.error("Error saving usage.json:", error instanceof Error ? error.message : String(error));
    return errorResponse("Your change could not be saved.", 500);
  }
  return null;
}
