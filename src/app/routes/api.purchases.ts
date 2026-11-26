import type { Route } from "./+types/api.purchases";
import { isCleanName } from "@/features/products/category-rules";
import type { Product } from "@/features/products/types";
import type { ProductPurchase } from "@/features/purchases/types";
import { isCalendarDate } from "@/utils/calendar-date";
import { modifyFile } from "@/utils/files.server";
import { today } from "@/utils/today";

class ValidationError extends Error {}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

type PurchaseItem = { productId: number; price: number };
type NewPurchase = { date: string; store?: string; items: PurchaseItem[] };
type EditedPurchase = NewPurchase & { replaces: number[] };
type DeletedPurchase = { productIds: number[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns a message naming the first key the body lacks or has beyond those allowed, if any. */
function checkKeys(body: Record<string, unknown>, required: string[], optional: string[] = []) {
  const unknownKey = Object.keys(body).find((key) => ![...required, ...optional].includes(key));
  if (unknownKey) return `Unknown field "${unknownKey}"`;
  const missing = required.find((key) => body[key] === undefined);
  if (missing) return `${missing} is required`;
}

/** Returns a message describing the first problem with a list of product ids naming one purchase. */
// @spec PURCH-API-030, PURCH-API-031
function checkIds(ids: unknown, field: string): string | undefined {
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(Number.isInteger)) {
    return `${field} must be a non-empty list of product ids`;
  }
  if (new Set(ids).size !== ids.length) return `${field} lists a product more than once`;
}

/** Returns a message describing the first problem with a POST body, or undefined if its shape is valid. */
// @spec PURCH-API-004, PURCH-API-005, PURCH-API-022
function checkShape(body: unknown): string | undefined {
  if (!isObject(body)) return "The request body must be an object";
  return checkKeys(body, ["date", "items"], ["store"]) ?? checkPurchaseFields(body);
}

/** Returns a message describing the first problem with a PUT body, or undefined if its shape is valid. */
// @spec PURCH-API-004, PURCH-API-028
function checkEditShape(body: unknown): string | undefined {
  if (!isObject(body)) return "The request body must be an object";
  return checkKeys(body, ["replaces", "date", "items"], ["store"]) ?? checkIds(body.replaces, "replaces") ?? checkPurchaseFields(body);
}

/** Returns a message describing the first problem with a DELETE body, or undefined if its shape is valid. */
// @spec PURCH-API-004, PURCH-API-029
function checkDeleteShape(body: unknown): string | undefined {
  if (!isObject(body)) return "The request body must be an object";
  return checkKeys(body, ["productIds"]) ?? checkIds(body.productIds, "productIds");
}

/** Checks the date, store, and items shared by POST and PUT bodies. */
// @spec PURCH-API-006, PURCH-API-007, PURCH-API-008, PURCH-API-009, PURCH-API-010, PURCH-API-011, PURCH-API-014
function checkPurchaseFields(body: Record<string, unknown>): string | undefined {
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

function purchaseOf(date: string, store: string | undefined, price: number): ProductPurchase {
  return store === undefined ? { date, price } : { date, store, price };
}

function withoutPurchase({ purchase: _purchase, ...rest }: Product): Product {
  return rest;
}

/** Throws unless the ids name products that all have one purchase: the same date and store, or all no store. */
// @spec PURCH-API-032, PURCH-API-033, PURCH-API-034
function checkOnePurchase(usage: Product[], ids: number[]) {
  const purchases = ids.map((id) => {
    const record = usage.find((candidate) => candidate.id === id);
    if (!record) throw new ValidationError(`No product has id ${id}`);
    if (!record.purchase) throw new ValidationError(`${record.brand} ${record.name} has no purchase`);
    return record.purchase;
  });
  const [first] = purchases;
  if (purchases.some((purchase) => purchase.date !== first.date || purchase.store !== first.store)) {
    throw new ValidationError("These products are not all in one purchase; it may have changed since you opened it");
  }
}

/** Replaces the purchase on the products in `replaces` with the edited one. */
// @spec PURCH-API-023, PURCH-API-024, PURCH-API-026, PURCH-API-035
function applyEdit(usage: Product[], { replaces, date, store, items }: EditedPurchase): Product[] {
  checkOnePurchase(usage, replaces);
  for (const { productId } of items) {
    const record = usage.find((candidate) => candidate.id === productId);
    if (!record) throw new ValidationError(`No product has id ${productId}`);
    if (record.purchase && !replaces.includes(productId)) {
      throw new ValidationError(`${record.brand} ${record.name} already has a purchase`);
    }
  }
  const prices = new Map(items.map(({ productId, price }) => [productId, price]));
  return usage.map((record) => {
    const price = prices.get(record.id);
    if (price !== undefined) return { ...record, purchase: purchaseOf(date, store, price) };
    return replaces.includes(record.id) ? withoutPurchase(record) : record;
  });
}

/** Removes the purchase from each named product. */
// @spec PURCH-API-025, PURCH-API-026
function applyDelete(usage: Product[], { productIds }: DeletedPurchase): Product[] {
  checkOnePurchase(usage, productIds);
  return usage.map((record) => (productIds.includes(record.id) ? withoutPurchase(record) : record));
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
    return { ...record, purchase: purchaseOf(date, store, price) };
  });
}

const handlers: Record<string, { check: (body: unknown) => string | undefined; apply: (usage: Product[], body: never) => Product[] }> = {
  POST: { check: checkShape, apply: applyPurchase },
  PUT: { check: checkEditShape, apply: applyEdit },
  DELETE: { check: checkDeleteShape, apply: applyDelete },
};

// @spec PURCH-API-003, PURCH-API-015, PURCH-API-016, PURCH-API-017, PURCH-API-018, PURCH-API-019, PURCH-API-020, PURCH-API-021, PURCH-API-027, PURCH-API-036
export async function action({ request }: Route.ActionArgs) {
  const handler = handlers[request.method];
  if (!handler) return errorResponse("Method not allowed", 405);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("The request body must be JSON", 400);
  }
  const shapeError = handler.check(body);
  if (shapeError) return errorResponse(shapeError, 400);

  try {
    // Checked inside the queue, so overlapping purchases see each other's writes.
    await modifyFile<Product[]>("usage.json", (usage) => handler.apply(usage, body as never));
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, 400);
    console.error("Error saving usage.json:", error instanceof Error ? error.message : String(error));
    return errorResponse("Your purchase could not be saved.", 500);
  }
  return null;
}
