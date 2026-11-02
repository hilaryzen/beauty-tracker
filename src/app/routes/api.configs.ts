import type { Route } from "./+types/api.configs";
import { checkRoutines } from "@/features/routine/routine-rules";
import { checkCategories } from "@/features/usage/category-rules";
import { loadUsage } from "@/features/usage/usage.server";
import { getFile, modifyFile } from "@/utils/files.server";

const configKeys = ["categories", "routines"];

class ValidationError extends Error {}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

// @spec STORE-API-001, STORE-API-002
export async function loader() {
  const configs = await getFile("configs.json");
  if (configs === undefined) return errorResponse("Your settings could not be loaded.", 500);
  return configs;
}

/** Returns a message describing the first validation failure in `body`, or undefined if it is valid. */
// @spec STORE-API-004, STORE-API-007
async function validate(body: unknown): Promise<string | undefined> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "The request body must be an object";
  }
  const unknownKey = Object.keys(body).find((key) => !configKeys.includes(key));
  if (unknownKey) return `Unknown setting "${unknownKey}"`;

  const changes = body as Record<string, unknown>;
  if (!("categories" in changes) && !("routines" in changes)) return;

  const usage = await loadUsage();
  if (usage === undefined) throw new Error("usage.json could not be read");

  if ("categories" in changes) {
    const error = checkCategories(changes.categories, usage);
    if (error) return error;
  }
  if ("routines" in changes) return checkRoutines(changes.routines, usage);
}

// @spec STORE-API-003, STORE-API-005, STORE-API-006, STORE-API-008, STORE-API-009
export async function action({ request }: Route.ActionArgs) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("The request body must be JSON", 400);
  }

  try {
    await modifyFile<Record<string, unknown>>("configs.json", async (configs) => {
      const error = await validate(body);
      if (error) throw new ValidationError(error);
      return { ...configs, ...(body as Record<string, unknown>) };
    });
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, 400);
    console.error("Error saving configs.json:", error instanceof Error ? error.message : String(error));
    return errorResponse("Your settings could not be saved.", 500);
  }
  return null;
}
