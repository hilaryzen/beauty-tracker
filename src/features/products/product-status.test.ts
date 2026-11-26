import { describe, expect, it } from "vitest";
import { isFinished, STATUSES, statusRank } from "./product-status";

describe("product statuses", () => {
  // @spec PROD-009
  it("lists the five statuses in lifecycle order", () => {
    expect(STATUSES).toEqual(["Backlog", "Opened", "In Progress", "Panned", "Decluttered"]);
  });

  // @spec PROD-010
  it("ranks statuses In Progress, Opened, Backlog, Panned, Decluttered, first to last", () => {
    const ranked = [...STATUSES].sort((a, b) => statusRank(a) - statusRank(b));
    expect(ranked).toEqual(["In Progress", "Opened", "Backlog", "Panned", "Decluttered"]);
    expect(new Set(STATUSES.map(statusRank)).size).toBe(5);
  });

  // @spec PROD-011
  it("treats a product whose status is Panned or Decluttered as finished", () => {
    expect(isFinished({ status: "Panned" })).toBe(true);
    expect(isFinished({ status: "Decluttered" })).toBe(true);
  });

  // @spec PROD-012
  it("treats a product with no status or any other status as not finished", () => {
    for (const status of ["Backlog", "Opened", "In Progress"]) expect(isFinished({ status })).toBe(false);
    expect(isFinished({})).toBe(false);
    expect(isFinished({ status: "panned" })).toBe(false);
    expect(isFinished({ status: "Used up" })).toBe(false);
    expect(isFinished({ status: 3 })).toBe(false);
  });
});
