import type { Route } from "./+types/api.purchases";
import { isCleanName } from "@/features/products/category-rules";
import type { Product } from "@/features/products/types";
import type { ProductPurchase } from "@/features/purchases/types";
import { modifyFile } from "@/utils/files.server";
import { today } from "@/utils/today";

class ValidationError extends Error {}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

type PurchaseItem = { productId: number; price: number };
type NewPurchase = { date: string; store?: string; items: PurchaseItem[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Whether `value` is a real calendar date written as `YYYY-MM-DD`. */
function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Returns a message describing the first problem with the body, or undefined if its shape is valid. */
// @spec PURCH-API-004, PURCH-API-005, PURCH-API-006, PURCH-API-007, PURCH-API-008, PURCH-API-009, PURCH-API-010, PURCH-API-011, PURCH-API-014
function checkShape(body: unknown): string | undefined {
  if (!isObject(body)) return "The request body must be an object";
  const unknownKey = Object.keys(body).find((key) => !["date", "store", "items"].includes(key));
  if (unknownKey) return `Unknown field "${unknownKey}"`;
  if (body.date === undefined) return "date is required";
  if (body.items === undefined) return "items is required";

  if (!isCalendarDate(body.date)) return "date must be a real date written as YYYY-MM-DD";
  if (body.date > today()) return "date must not be after today";
  if ("store" in body && !isCleanName(body.store)) return "store must not be blank or start or end with spaces";

  const { items } = body;
  if (!Array.isArray(items) || items.length === 0) return "items must be a non-empty list";
  for (const item of items) {
    if (!isObject(item) || Object.keys(item).length !== 2 || !("productId" in item) || !("price" in item)) {
      return "Each item must have exactly a productId and a price";
    }
    if (!Number.isInteger(item.price) || (item.price as number) < 0) {
      return "price must be a whole number of cents, 0 or more";
    }
    if (!Number.isInteger(item.productId)) return "productId must be a product id";
  }
  const ids = items.map((item) => item.productId);
  if (new Set(ids).size !== ids.length) return "items lists a product more than once";
}

/** Records the purchase on each item's product, rejecting unknown products and products already bought. */
// @spec PURCH-API-001, PURCH-API-002, PURCH-API-012, PURCH-API-013
function applyPurchase(usage: Product[], { date, store, items }: NewPurchase): Product[] {
  for (const { productId } of items) {
    const record = usage.find((candidate) => candidate.id === productId);
    if (!record) throw new ValidationError(`No product has id ${productId}`);
    if (record.purchase) throw new ValidationError(`${record.brand} ${record.name} already has a purchase`);
  }
  const prices = new Map(items.map(({ productId, price }) => [productId, price]));
  return usage.map((record) => {
    const price = prices.get(record.id);
    if (price === undefined) return record;
    const purchase: ProductPurchase = store === undefined ? { date, price } : { date, store, price };
    return { ...record, purchase };
  });
}

// @spec PURCH-API-003, PURCH-API-015, PURCH-API-016, PURCH-API-017, PURCH-API-018, PURCH-API-019, PURCH-API-020, PURCH-API-021
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") return errorResponse("Method not allowed", 405);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("The request body must be JSON", 400);
  }
  const shapeError = checkShape(body);
  if (shapeError) return errorResponse(shapeError, 400);

  try {
    // Checked inside the queue, so overlapping purchases see each other's writes.
    await modifyFile<Product[]>("usage.json", (usage) => applyPurchase(usage, body as NewPurchase));
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, 400);
    console.error("Error saving usage.json:", error instanceof Error ? error.message : String(error));
    return errorResponse("Your purchase could not be saved.", 500);
  }
  return null;
}
