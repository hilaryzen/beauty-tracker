import { Container, Heading } from "@chakra-ui/react";
import type { Route } from "./+types/settings";
import { CategoryEditor } from "@/features/products/category-editor";
import type { Product } from "@/features/products/types";
import type { Categories } from "@/features/products/use-product-editor";
import { getFile } from "@/utils/files.server";

// Reads usage.json directly, not through usage's loader, so loading this page applies no rollover.
// @spec SHELL-SET-002, SHELL-SET-003, SHELL-SET-004
export async function loader() {
  const configs = await getFile("configs.json");
  const usage: Product[] | undefined = await getFile("usage.json");
  if (configs === undefined || usage === undefined) {
    throw new Response(null, { status: 500, statusText: "Your data could not be loaded." });
  }
  return { usage, categories: configs.categories as Categories | undefined };
}

// @spec SHELL-SET-001, SHELL-SET-002
export default function Settings({ loaderData }: Route.ComponentProps) {
  return (
    <Container as="main" pt="8" pb="4">
      <Heading as="h1" size="2xl" mb="6">Settings</Heading>
      <CategoryEditor categories={loaderData.categories} usage={loaderData.usage} />
    </Container>
  );
}
