import { useRevalidator } from "react-router";
import { toaster } from "@/components/ui/toaster";
import { sendJson } from "@/utils/send-json";

export type PurchaseDraft = {
  date: string;
  /** As typed; trimmed before sending, and left out when blank. */
  store: string;
  /** Prices in whole cents, in the order entered. */
  items: { productId: number; price: number }[];
};

// @spec PURCH-SAVE-001, PURCH-SAVE-002, PURCH-SAVE-003, PURCH-SAVE-005, PURCH-SAVE-010, PURCH-SAVE-011
export function usePurchaseEditor() {
  const { revalidate } = useRevalidator();

  async function send(method: "POST" | "PUT" | "DELETE", body: unknown) {
    const result = await sendJson("/api/purchases", method, body);
    if (!result.ok) {
      toaster.create({ type: "error", title: result.message });
      return false;
    }
    await revalidate();
    return true;
  }

  /**
   * Saves the purchase and reloads the page's data: adds it, or, given the ids of the products an
   * existing purchase had, replaces that purchase. Returns whether it saved.
   */
  function savePurchase({ date, store, items }: PurchaseDraft, replaces?: number[]) {
    const trimmedStore = store.trim();
    const fields = trimmedStore === "" ? { date, items } : { date, store: trimmedStore, items };
    return replaces === undefined ? send("POST", fields) : send("PUT", { replaces, ...fields });
  }

  /** Deletes the purchase made up of these products and reloads the page's data. Returns whether it deleted. */
  function deletePurchase(productIds: number[]) {
    return send("DELETE", { productIds });
  }

  return { savePurchase, deletePurchase };
}
