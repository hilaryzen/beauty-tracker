import type { Route } from "./+types/home";
import Welcome from "../welcome/welcome";
import { UsageTable } from "@/features/usage/usage-table";
import { getFile } from "@/utils/files.server";

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
  return {
    usage: await readFromFile("usage.json"), 
    configs: await readFromFile("configs.json")
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Welcome />
      <UsageTable usage={loaderData.usage} configs={loaderData.configs}/>
    </>
  );
}