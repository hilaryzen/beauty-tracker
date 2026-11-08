import { useRevalidator } from "react-router";
import { toaster } from "@/components/ui/toaster";
import { sendJson } from "@/utils/send-json";

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
async function send(url: string, method: "POST" | "PUT", body: unknown) {
  const result = await sendJson(url, method, body);
  return result.ok ? undefined : result.message;
}

// @spec PROD-EDIT-011, PROD-SAVE-004, PROD-SAVE-005, PROD-SAVE-006, PROD-SAVE-007, PROD-SAVE-009, PROD-SAVE-013
export function useProductEditor(categories: Categories | undefined) {
  const { revalidate } = useRevalidator();

  /**
   * Saves a new category if there is one, then the product, then reloads the page's data.
   * Returns undefined if anything failed; otherwise the added product's id (none for an edit).
   */
  async function saveProduct({ id, name, brand, category, group }: ProductDraft) {
    const existing = findCategory(categories, category);
    const categoryName = existing?.category ?? category.trim();

    if (!existing) {
      const message = await send("/api/configs", "POST", {
        categories: withNewCategory(categories, categoryName, (group ?? "").trim()),
      });
      if (message) {
        toaster.create({ type: "error", title: message });
        return undefined;
      }
    }

    const fields = { name: name.trim(), brand: brand.trim(), category: categoryName };
    const result = await (id === undefined
      ? sendJson("/api/products", "POST", fields)
      : sendJson("/api/products", "PUT", { id, ...fields }));
    if (!result.ok) {
      toaster.create({ type: "error", title: result.message });
      // A category saved in the first step should now appear in the dropdown.
      if (!existing) await revalidate();
      return undefined;
    }

    await revalidate();
    const added = (result.data as { id?: unknown } | null | undefined)?.id;
    return { id: id === undefined && Number.isInteger(added) ? (added as number) : undefined };
  }

  return { saveProduct };
}
