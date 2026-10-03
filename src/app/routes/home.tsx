import type { Route } from "./+types/home";
import { UsageTable } from "@/features/usage/usage-table";
import { getFile } from "@/utils/files.server";
import { RoutineCard } from "@/features/routine/routine-card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

async function readFromFile(fileName: string) {
  const data = await getFile(fileName);
  if (!data) throw new Response("Not Found", { status: 404 });
  return data;
}

export async function loader() {
  const configs = await readFromFile("configs.json");
  return {
    usage: await readFromFile("usage.json"), 
    categories: configs.categories,
    routines: configs.routines
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <RoutineCard usage={loaderData.usage} routines={loaderData.routines}/>
      <UsageTable usage={loaderData.usage} categories={loaderData.categories}/>
    </>
  );
}