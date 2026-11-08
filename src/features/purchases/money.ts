const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Formats cents as US dollars with two decimal places, such as `$32.00`. */
// @spec PURCH-LIST-009
export function formatDollars(cents: number) {
  return dollars.format(cents / 100);
}

/**
 * Parses a typed dollar amount into whole cents: digits with an optional decimal point and at most
 * two decimal places, ignoring surrounding whitespace and one leading `$`. Returns undefined if the
 * text is not such an amount. Works on the digits, not on floating-point dollars, so `19.99` is 1999.
 */
// @spec PURCH-DLG-016, PURCH-SAVE-001
export function parseDollars(text: string): number | undefined {
  const trimmed = text.trim();
  const amount = trimmed.startsWith("$") ? trimmed.slice(1) : trimmed;
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(amount);
  if (!match) return undefined;
  const [, whole, fraction = ""] = match;
  if (whole === "" && fraction === "") return undefined;
  return Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
}
