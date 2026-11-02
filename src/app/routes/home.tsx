import type { Route } from "./+types/home";
import { UsageTable } from "@/features/usage/usage-table";
import { loadUsage } from "@/features/usage/usage.server";
import { getFile } from "@/utils/files.server";
import { RoutineCard } from "@/features/routine/routine-card";

// The document title is set for every page in the root layout.
// @spec SHELL-HOME-004
export function meta({}: Route.MetaArgs) {
  return [
    { name: "description", content: "Track beauty product usage, purchases, and inventory" },
  ];
}

// @spec SHELL-HOME-002, USAGE-ROLL-005, ROUT-001
export async function loader() {
  const configs = await getFile("configs.json");
  const usage = await loadUsage();
  if (configs === undefined || usage === undefined) {
    throw new Response(null, { status: 500, statusText: "Your data could not be loaded." });
  }
  return {
    usage,
    categories: configs.categories,
    routines: configs.routines
  };
}

// @spec SHELL-HOME-001
export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <RoutineCard usage={loaderData.usage} routines={loaderData.routines}/>
      <UsageTable usage={loaderData.usage} categories={loaderData.categories}/>
    </>
  );
}
