import type { Route } from "./+types/api.products";
import { isCleanName } from "@/features/products/category-rules";
import type { Product } from "@/features/products/types";
import { isCalendarDate } from "@/utils/calendar-date";
import { modifyFiles } from "@/utils/files.server";
import { thisMonth } from "@/utils/this-month";
import { today } from "@/utils/today";

class ValidationError extends Error {}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** Fields a request may leave out; leaving one out means the product has none. */
const OPTIONAL_KEYS = ["shade", "opened", "expires", "removed"] as const;
const DATE_KEYS = ["opened", "expires", "removed"] as const;
/** Dates that must not be after today. */
const PAST_DATE_KEYS = ["opened", "removed"] as const;

type ProductFields = Pick<Product, "name" | "brand" | "category" | (typeof OPTIONAL_KEYS)[number]>;
type ProductChange = ProductFields & Pick<Product, "id">;

/** Returns a message describing the first problem with the body's shape, or undefined if it is valid. */
// @spec PROD-API-007, PROD-API-008, PROD-API-009, PROD-API-012, PROD-API-023, PROD-API-029, PROD-API-030
function checkShape(body: unknown, requiredKeys: string[]): string | undefined {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "The request body must be an object";
  }
  const allowed: string[] = [...requiredKeys, ...OPTIONAL_KEYS];
  const unknownKey = Object.keys(body).find((key) => !allowed.includes(key));
  if (unknownKey) return `Unknown field "${unknownKey}"`;

  const fields = body as Record<string, unknown>;
  const missing = requiredKeys.find((key) => fields[key] === undefined);
  if (missing) return `${missing} is required`;
  if (!isCleanName(fields.name)) return "name must not be blank or start or end with spaces";
  if (!isCleanName(fields.brand)) return "brand must not be blank or start or end with spaces";
  if ("shade" in fields && !isCleanName(fields.shade)) return "shade must not be blank or start or end with spaces";
  for (const key of DATE_KEYS) {
    if (key in fields && !isCalendarDate(fields[key])) return `${key} must be a real date written as YYYY-MM-DD`;
  }
  for (const key of PAST_DATE_KEYS) {
    if (key in fields && (fields[key] as string) > today()) return `${key} must not be after today`;
  }
}

/** The optional fields the body has, so a field the body leaves out is absent from the record. */
function optionalFields(fields: ProductFields): Partial<ProductFields> {
  return Object.fromEntries(OPTIONAL_KEYS.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]]));
}

function nextId(usage: Product[]) {
  return Math.max(-1, ...usage.map((record) => record.id)) + 1;
}

/** Appends a new record, with an id one higher than any existing one, the body's shade and dates if any, and no purchase. */
// @spec PROD-API-001, PROD-API-002, PROD-API-003, PROD-API-021, PROD-API-024, PROD-API-025, PROD-API-031, PROD-API-032
function addProduct(usage: Product[], fields: ProductFields): Product[] {
  const { name, brand, category } = fields;
  const id = nextId(usage);
  return [
    ...usage,
    { id, name, brand, category, ...optionalFields(fields), uses: {}, currentMonth: thisMonth(), usesThisMonth: 0 },
  ];
}

/**
 * Replaces the fields the products segment owns, leaving the id, counts, and purchase alone.
 * A body without a shade or a date removes that field from the record.
 */
// @spec PROD-002, PROD-API-004, PROD-API-005, PROD-API-011, PROD-API-022, PROD-API-026, PROD-API-027, PROD-API-033, PROD-API-034
function editProduct(usage: Product[], change: ProductChange): Product[] {
  const { id, name, brand, category } = change;
  if (!usage.some((record) => record.id === id)) throw new ValidationError(`No product has id ${id}`);
  return usage.map((record) => {
    if (record.id !== id) return record;
    const rest: Product = { ...record };
    for (const key of OPTIONAL_KEYS) delete rest[key];
    return { ...rest, name, brand, category, ...optionalFields(change) };
  });
}

// @spec PROD-API-006, PROD-API-010, PROD-API-013, PROD-API-014, PROD-API-015, PROD-API-016, PROD-API-017, PROD-API-018, PROD-API-019, PROD-API-020, PROD-API-028
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
    let addedId: number | undefined;
    // Holding configs.json too keeps a category edit from landing between the category check and the write.
    await modifyFiles(["configs.json", "usage.json"], async ({ read, write }) => {
      const configs = await read<{ categories?: Record<string, string[]> }>("configs.json");
      const { category } = body as ProductFields;
      if (!Object.values(configs.categories ?? {}).flat().includes(category)) {
        throw new ValidationError(`Category "${category}" is not configured`);
      }
      const usage = await read<Product[]>("usage.json");
      if (isEdit) {
        await write("usage.json", editProduct(usage, body as ProductChange));
      } else {
        addedId = nextId(usage);
        await write("usage.json", addProduct(usage, body as ProductFields));
      }
    });
    if (addedId !== undefined) return Response.json({ id: addedId });
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, 400);
    console.error("Error saving usage.json:", error instanceof Error ? error.message : String(error));
    return errorResponse("Your change could not be saved.", 500);
  }
  return null;
}
