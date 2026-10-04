import { useFetcher } from "react-router";
import type { ItemUsage } from "./types";

export function useUsage(usage: ItemUsage[]) {
  const fetcher = useFetcher();
  function submitUsage(newUsage: ItemUsage[]) {
    fetcher.submit(newUsage, {
      method: "post",
      action: "/api/usage",
      encType: "application/json",
    });
  }

  function addUsesToItems(ids: Array<number>) {
    const usageCopy = [...usage];
    ids.map((id: number) => {
      const item = usageCopy[id];
      usageCopy[id] = { ...item, usesThisMonth: item.usesThisMonth + 1 };
    })
    submitUsage(usageCopy);
  }

  function removeUsesFromItems(ids: Array<number>) {
    const usageCopy = [...usage];
    ids.map((id: number) => {
      const item = usageCopy[id];
      usageCopy[id] = { ...item, usesThisMonth: item.usesThisMonth - 1 };
    })
    submitUsage(usageCopy);
  }

  return { addUsesToItems, removeUsesFromItems, fetcher };
}