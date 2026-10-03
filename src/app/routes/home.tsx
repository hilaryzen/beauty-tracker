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

export async function loader() {
  const usage = await getFile("usage.json");
  if (!usage) throw new Response("Not Found", { status: 404 });
  return usage;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Welcome />
      <UsageTable usage={loaderData} />
    </>
  );
}