import type { Route } from "./+types/api.usage";
import type { Product } from "@/features/products/types";
import { hasValidMonths, loadUsage, rollOver } from "@/features/usage/usage.server";
import { modifyFile } from "@/utils/files.server";

class ValidationError extends Error {}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

// @spec USAGE-API-001, USAGE-API-002, USAGE-ROLL-006
export async function loader() {
  try {
    const usage = await loadUsage();
    if (usage === undefined) return errorResponse("Your usage data could not be loaded.", 500);
    return usage;
  } catch {
    return errorResponse("Your usage data could not be loaded.", 500);
  }
}

type UsageChange = { ids: number[]; delta: 1 | -1 };

/** Returns a message describing the first problem with the body's shape, or undefined if it is valid. */
// @spec USAGE-API-004, USAGE-API-005, USAGE-API-006, USAGE-API-008
function checkShape(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "The request body must be an object";
  }
  const unknownKey = Object.keys(body).find((key) => key !== "ids" && key !== "delta");
  if (unknownKey) return `Unknown field "${unknownKey}"`;

  const { ids, delta } = body as Record<string, unknown>;
  if (ids === undefined) return "ids is required";
  if (delta === undefined) return "delta is required";
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(Number.isInteger)) {
    return "ids must be a non-empty list of product ids";
  }
  if (new Set(ids).size !== ids.length) return "ids lists a product more than once";
  if (delta !== 1 && delta !== -1) return "delta must be 1 or -1";
}

/** Applies the change to every listed product, never taking a count below 0. */
// @spec PROD-002, USAGE-LOG-003, USAGE-LOG-006, USAGE-LOG-012
function applyChange(usage: Product[], { ids, delta }: UsageChange): Product[] {
  const unknown = ids.find((id) => !usage.some((record) => record.id === id));
  if (unknown !== undefined) throw new ValidationError(`No product has id ${unknown}`);
  return usage.map((record) =>
    ids.includes(record.id)
      ? { ...record, usesThisMonth: Math.max(0, record.usesThisMonth + delta) }
      : record,
  );
}

// @spec USAGE-ROLL-007, USAGE-API-003, USAGE-API-007, USAGE-API-009, USAGE-API-010, USAGE-API-011, USAGE-API-012
export async function action({ request }: Route.ActionArgs) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("The request body must be JSON", 400);
  }
  const shapeError = checkShape(body);
  if (shapeError) return errorResponse(shapeError, 400);

  try {
    await modifyFile<Product[]>("usage.json", (usage) => {
      if (!hasValidMonths(usage)) throw new Error("usage.json has a record with no valid currentMonth");
      return applyChange(rollOver(usage), body as UsageChange);
    });
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, 400);
    console.error("Error saving usage.json:", error instanceof Error ? error.message : String(error));
    return errorResponse("Your change could not be saved.", 500);
  }
  return null;
}
