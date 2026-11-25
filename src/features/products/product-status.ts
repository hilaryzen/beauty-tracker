/** Every product status, in the order a product moves through them; the product dialog offers them in this order. */
// @spec PROD-009
export const STATUSES = ["Backlog", "Opened", "In Progress", "Panned", "Decluttered"] as const;

export type ProductStatus = (typeof STATUSES)[number];

/** Status order: products in active use first, those no longer owned last. */
const STATUS_ORDER: readonly ProductStatus[] = ["In Progress", "Opened", "Backlog", "Panned", "Decluttered"];

/** Whether a value is one of the five statuses, matching capitalization exactly. */
export function isStatus(value: unknown): value is ProductStatus {
  return (STATUSES as readonly unknown[]).includes(value);
}

/** A status's position in status order, 0 for `In Progress` through 4 for `Decluttered`. */
// @spec PROD-010
export function statusRank(status: ProductStatus): number {
  return STATUS_ORDER.indexOf(status);
}
