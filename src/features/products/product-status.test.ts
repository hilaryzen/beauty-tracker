import { describe, expect, it } from "vitest";
import { STATUSES, statusRank } from "./product-status";

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
});
