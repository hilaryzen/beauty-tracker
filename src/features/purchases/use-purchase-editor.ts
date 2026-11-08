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

// @spec PURCH-SAVE-001, PURCH-SAVE-002, PURCH-SAVE-003, PURCH-SAVE-005
export function usePurchaseEditor() {
  const { revalidate } = useRevalidator();

  /** Saves the purchase and reloads the page's data. Returns whether it saved. */
  async function savePurchase({ date, store, items }: PurchaseDraft) {
    const trimmedStore = store.trim();
    const body = trimmedStore === "" ? { date, items } : { date, store: trimmedStore, items };
    const result = await sendJson("/api/purchases", "POST", body);
    if (!result.ok) {
      toaster.create({ type: "error", title: result.message });
      return false;
    }
    await revalidate();
    return true;
  }

  return { savePurchase };
}
