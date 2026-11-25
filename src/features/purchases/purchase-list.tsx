import { Box, Button, Flex, Heading, HStack, List, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import type { Product } from "@/features/products/types";
import type { Categories } from "@/features/products/use-product-editor";
import { formatDollars } from "./money";
import { PurchaseDialog } from "./purchase-dialog";
import type { ProductPurchase } from "./types";

type PurchaseListProps = {
  usage: Product[];
  categories?: Categories;
};

type Purchase = { date: string; store?: string; products: (Product & { purchase: ProductPurchase })[] };

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** `YYYY-MM-DD` as `Nov 7, 2026`, read as a local date. */
// @spec PURCH-LIST-005
function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return dateFormat.format(new Date(year, month - 1, day));
}

/** Products grouped by purchase date and exact store, newest first, then by store, with no store last. */
// @spec PURCH-LIST-002, PURCH-LIST-003, PURCH-LIST-004, PURCH-LIST-008
function groupPurchases(usage: Product[]): Purchase[] {
  const groups = new Map<string, Purchase>();
  for (const product of usage) {
    const { purchase } = product;
    if (!purchase) continue;
    const key = JSON.stringify([purchase.date, purchase.store ?? null]);
    const group = groups.get(key) ?? { date: purchase.date, store: purchase.store, products: [] };
    group.products.push({ ...product, purchase });
    groups.set(key, group);
  }
  for (const group of groups.values()) group.products.sort((a, b) => a.id - b.id);
  return [...groups.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.store === undefined || b.store === undefined) return (a.store === undefined ? 1 : 0) - (b.store === undefined ? 1 : 0);
    return a.store.localeCompare(b.store, undefined, { sensitivity: "base" });
  });
}

// @spec PURCH-LIST-001, PURCH-LIST-006, PURCH-LIST-007, PURCH-LIST-010, PURCH-DLG-001
export function PurchaseList({ usage, categories }: PurchaseListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const purchases = groupPurchases(usage);

  return (
    <>
      <Flex justify="flex-end" mb="4">
        <Button onClick={() => setDialogOpen(true)}>Add purchase</Button>
      </Flex>
      {purchases.length === 0 ? (
        <Text color="fg.muted">No purchases yet.</Text>
      ) : (
        <Stack gap="4">
          {purchases.map((purchase) => {
            const total = purchase.products.reduce((sum, product) => sum + product.purchase.price, 0);
            return (
              <Box
                as="article"
                key={`${purchase.date}|${purchase.store ?? ""}`}
                borderWidth="1px"
                borderRadius="md"
                p="4"
              >
                <Flex justify="space-between" align="baseline" mb="2" gap="4">
                  <Heading as="h2" size="md">
                    <span>{formatDate(purchase.date)}</span>
                    {purchase.store !== undefined && (
                      <>
                        {" · "}
                        <span>{purchase.store}</span>
                      </>
                    )}
                  </Heading>
                  <Text fontWeight="semibold">{`Total ${formatDollars(total)}`}</Text>
                </Flex>
                <List.Root listStyleType="none" gap="1">
                  {purchase.products.map((product) => (
                    <List.Item key={product.id}>
                      <HStack justify="space-between" gap="4">
                        <Text>
                          <Text as="span" color="fg.muted">{product.brand}</Text> {product.name}
                        </Text>
                        <Text>{formatDollars(product.purchase.price)}</Text>
                      </HStack>
                    </List.Item>
                  ))}
                </List.Root>
              </Box>
            );
          })}
        </Stack>
      )}
      <PurchaseDialog
        open={dialogOpen}
        usage={usage}
        categories={categories}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
