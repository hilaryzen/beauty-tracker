import { Container, Heading } from "@chakra-ui/react";
import type { Route } from "./+types/purchases";
import type { Product } from "@/features/products/types";
import type { Categories } from "@/features/products/use-product-editor";
import { PurchaseList } from "@/features/purchases/purchase-list";
import { getFile } from "@/utils/files.server";

// Reads usage.json directly, not through usage's loader, so loading this page applies no rollover.
// @spec SHELL-PURCH-003, SHELL-PURCH-004
export async function loader() {
  const configs = await getFile("configs.json");
  const usage: Product[] | undefined = await getFile("usage.json");
  if (configs === undefined || usage === undefined) {
    throw new Response(null, { status: 500, statusText: "Your data could not be loaded." });
  }
  return { usage, categories: configs.categories as Categories | undefined };
}

// @spec SHELL-PURCH-001, SHELL-PURCH-003
export default function Purchases({ loaderData }: Route.ComponentProps) {
  return (
    <Container as="main" pt="8" pb="4">
      <Heading as="h1" size="2xl" mb="2">Purchases</Heading>
      <PurchaseList usage={loaderData.usage} categories={loaderData.categories} />
    </Container>
  );
}
