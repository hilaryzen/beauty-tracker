import type { Route } from "./+types/api.usage";
import { getFile, updateFile } from "@/utils/files.server";

export async function loader() {
  const usage = await getFile("configs.json");
  if (!usage) throw new Response("Not Found", { status: 404 });
  return usage;
}

export async function action({ request }: Route.ActionArgs) {
  const usage = await request.json();
  await updateFile("configs.json", usage);
  return null;
}