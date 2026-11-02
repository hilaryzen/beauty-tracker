import { useRevalidator } from "react-router";
import { toaster } from "@/components/ui/toaster";

// @spec USAGE-LOG-004, USAGE-LOG-005, USAGE-LOG-007, USAGE-LOG-008, USAGE-LOG-009, USAGE-LOG-010, USAGE-LOG-011
export function useUsage() {
  const { revalidate } = useRevalidator();

  // Each call sends its own request so a rapid second click never cancels the first.
  async function submitChange(ids: number[], delta: 1 | -1) {
    try {
      const response = await fetch("/api/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, delta }),
      });
      if (!response.ok) throw new Error(`Saving usage failed with status ${response.status}`);
    } catch {
      toaster.create({ type: "error", title: "Your change was not saved." });
      return;
    }
    await revalidate();
  }

  function addUsesToItems(ids: Array<number>) {
    return submitChange(ids, 1);
  }

  function removeUsesFromItems(ids: Array<number>) {
    return submitChange(ids, -1);
  }

  return { addUsesToItems, removeUsesFromItems };
}
