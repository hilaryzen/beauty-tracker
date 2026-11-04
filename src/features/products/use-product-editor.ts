import { useRevalidator } from "react-router";
import { toaster } from "@/components/ui/toaster";

export type Categories = Record<string, string[]>;

export type ProductDraft = {
  id?: number;
  name: string;
  brand: string;
  /** An existing category's name, or a typed name. */
  category: string;
  /** The group for a typed category name that matches no existing category. */
  group?: string;
};

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** The configured category and group matching a typed name, ignoring capitalization. */
export function findCategory(categories: Categories | undefined, typed: string) {
  for (const [group, names] of Object.entries(categories ?? {})) {
    const category = names.find((name) => sameName(name, typed));
    if (category !== undefined) return { category, group };
  }
}

/** The current categories plus a new one at the end of its group. */
// @spec PROD-SAVE-001, PROD-SAVE-002, PROD-SAVE-003
function withNewCategory(categories: Categories | undefined, category: string, typedGroup: string): Categories {
  const current = categories ?? {};
  const group = Object.keys(current).find((name) => sameName(name, typedGroup)) ?? typedGroup;
  return { ...current, [group]: [...(current[group] ?? []), category] };
}

/** Sends one request; returns the message to show if it failed, or undefined if it succeeded. */
// @spec PROD-SAVE-011, PROD-SAVE-012, PROD-SAVE-014
async function send(url: string, method: "POST" | "PUT", body: unknown) {
  const notSaved = "Your change was not saved.";
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return notSaved;
  }
  if (response.ok) return undefined;
  const parsed = await response.json().catch(() => undefined);
  return typeof parsed?.error === "string" && parsed.error !== "" ? parsed.error : notSaved;
}

// @spec PROD-EDIT-011, PROD-SAVE-004, PROD-SAVE-005, PROD-SAVE-006, PROD-SAVE-007, PROD-SAVE-009, PROD-SAVE-013
export function useProductEditor(categories: Categories | undefined) {
  const { revalidate } = useRevalidator();

  /** Saves a new category if there is one, then the product. Returns whether everything saved. */
  async function saveProduct({ id, name, brand, category, group }: ProductDraft) {
    const existing = findCategory(categories, category);
    const categoryName = existing?.category ?? category.trim();

    if (!existing) {
      const message = await send("/api/configs", "POST", {
        categories: withNewCategory(categories, categoryName, (group ?? "").trim()),
      });
      if (message) {
        toaster.create({ type: "error", title: message });
        return false;
      }
    }

    const fields = { name: name.trim(), brand: brand.trim(), category: categoryName };
    const message = await (id === undefined
      ? send("/api/products", "POST", fields)
      : send("/api/products", "PUT", { id, ...fields }));
    if (message) {
      toaster.create({ type: "error", title: message });
      // A category saved in the first step should now appear in the dropdown.
      if (!existing) await revalidate();
      return false;
    }

    await revalidate();
    return true;
  }

  return { saveProduct };
}
