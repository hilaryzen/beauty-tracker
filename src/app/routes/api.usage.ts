import type { Route } from "./+types/api.usage";
import { getUsage, updateUsage } from "@/features/usage/api/usage.server";

export async function loader() {
  const usage = await getUsage();
  if (!usage) throw new Response("Not Found", { status: 404 });
  return usage;
}

export async function action({ request }: Route.ActionArgs) {
  const usage = await request.json();
  await updateUsage(usage);
  return null;
}