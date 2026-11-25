import type { ProductPurchase } from "@/features/purchases/types";
import type { ProductSize } from "./product-details";

// @spec PROD-001, PROD-003, PROD-004, PROD-005, PROD-006, PROD-007, PROD-008
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
  /** How much product the package holds; absent when not recorded. */
  size?: ProductSize,
  /** The user's rating, an integer from 1 (worst) to 5 (best); absent when not rated. */
  rating?: number,
  /** Free-form notes, possibly several lines; absent when there are none. */
  notes?: string,
  uses: Record<string, number>,
  currentMonth: string,
  usesThisMonth: number,
  /** Set only by the purchases segment. */
  purchase?: ProductPurchase
}
