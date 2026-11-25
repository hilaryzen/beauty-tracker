import type { ProductPurchase } from "@/features/purchases/types";

// @spec PROD-001, PROD-003, PROD-004, PROD-005
export type Product = {
  id: number,
  name: string,
  brand: string,
  category: string,
  /** The shade or color variant; absent when the product has none. */
  shade?: string,
  /** The day the product was first opened, as `YYYY-MM-DD`; absent when not recorded. */
  opened?: string,
  /** The day the product expires, as `YYYY-MM-DD`; absent when not recorded. */
  expires?: string,
  /** The day the product was used up, thrown out, or given away, as `YYYY-MM-DD`; absent when not recorded. */
  removed?: string,
  uses: Record<string, number>,
  currentMonth: string,
  usesThisMonth: number,
  /** Set only by the purchases segment. */
  purchase?: ProductPurchase
}
