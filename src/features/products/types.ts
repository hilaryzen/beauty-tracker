import type { ProductPurchase } from "@/features/purchases/types";

// @spec PROD-001, PROD-003
export type Product = {
  id: number,
  name: string,
  brand: string,
  category: string,
  uses: Record<string, number>,
  currentMonth: string,
  usesThisMonth: number,
  /** Set only by the purchases segment. */
  purchase?: ProductPurchase
}
