const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** A purchase date (`YYYY-MM-DD`) as `Nov 7, 2026`, read as a local date. */
// @spec PURCH-LIST-005
export function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return dateFormat.format(new Date(year, month - 1, day));
}
