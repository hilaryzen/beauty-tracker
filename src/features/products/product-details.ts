/** The units a product's size may be recorded in, in the order the product dialog offers them. */
export const SIZE_UNITS = ["oz", "fl oz", "g", "mL"] as const;

export type SizeUnit = (typeof SIZE_UNITS)[number];

/** How much product the package holds. */
export type ProductSize = { amount: number; unit: SizeUnit };

/** Whether a value satisfies the record rules for `size`: exactly `amount` (a finite number > 0) and `unit` (a listed unit). */
export function isProductSize(value: unknown): value is ProductSize {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes("amount") || !keys.includes("unit")) return false;
  const { amount, unit } = value as Record<string, unknown>;
  return (
    typeof amount === "number" &&
    Number.isFinite(amount) &&
    amount > 0 &&
    (SIZE_UNITS as readonly unknown[]).includes(unit)
  );
}

/** Whether a value satisfies the record rules for `rating`: an integer from 1 to 5. */
export function isRating(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5;
}

/** A size amount written in its shortest decimal form, without trailing zeros (`1.7`, `50`). */
export function formatAmount(amount: number) {
  return String(amount);
}

/** A size as its amount, a space, and its unit (`1.7 fl oz`). */
export function formatSize(size: ProductSize) {
  return `${formatAmount(size.amount)} ${size.unit}`;
}

const AMOUNT_FORM = /^(?:\d+\.?\d{0,2}|\.\d{1,2})$/;

/**
 * Reads a typed size amount: digits with an optional decimal point and at most two decimal places,
 * ignoring surrounding whitespace. Returns the amount, or undefined if the text is not in that form or is 0.
 */
export function parseSizeAmount(text: string): number | undefined {
  const trimmed = text.trim();
  if (!AMOUNT_FORM.test(trimmed)) return undefined;
  const amount = Number(trimmed);
  return amount > 0 ? amount : undefined;
}
