/** A product's purchase, stored in the product record's optional `purchase` field. */
// @spec PURCH-001
export type ProductPurchase = {
  /** The day it was bought, as `YYYY-MM-DD`. */
  date: string;
  /** Where it was bought; absent when no store was entered. */
  store?: string;
  /** The price paid, in cents. */
  price: number;
};
