import type { Product } from "./types";

/**
 * A product's name followed by its shade when it has one (`Lip Glow – Berry`),
 * as one piece of text so the shade shares the name's style.
 */
export function productName(product: Pick<Product, "name" | "shade">) {
  return product.shade === undefined ? product.name : `${product.name} – ${product.shade}`;
}
