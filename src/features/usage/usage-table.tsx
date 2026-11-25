import { Button, Flex, Table, Tabs, Text } from "@chakra-ui/react"
import { AddMinusButtons } from "@/components/add-minus-buttons/main";
import { ProductDialog } from "@/features/products/product-dialog";
import { productName } from "@/features/products/product-name";
import type { Product } from "@/features/products/types";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useUsage } from "./use-usage";

type UsageTableProps = {
  usage: Product[];
  categories?: Record<string, Array<string>>
}

// Tab values: "All" cannot collide with a group, even one named "All".
const ALL_TAB = "all";
const groupTab = (group: string) => `group:${group}`;

function overallUses(item: Product) {
  return Object.values(item.uses).reduce((sum, value) => sum + value, 0) + item.usesThisMonth;
}

// @spec USAGE-UI-001, USAGE-UI-002, USAGE-UI-003, USAGE-UI-004, USAGE-UI-005, USAGE-UI-006, USAGE-UI-007, USAGE-UI-008, USAGE-UI-009, USAGE-UI-010, USAGE-UI-011, USAGE-UI-012, USAGE-UI-013, USAGE-UI-014, USAGE-UI-015, USAGE-UI-016, USAGE-UI-017, USAGE-UI-018, USAGE-UI-019, USAGE-UI-020, USAGE-UI-021, USAGE-UI-022, USAGE-UI-023, USAGE-UI-024, USAGE-LOG-001, USAGE-LOG-002
export const UsageTable = ({ usage, categories }: UsageTableProps) => {
  const { addUsesToItems, removeUsesFromItems } = useUsage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>();

  function openDialog(product?: Product) {
    setEditing(product);
    setDialogOpen(true);
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const groups = categories ?? {};
  // The selected group comes from the URL; a name that is not a configured group selects "All".
  const requested = searchParams.get("group");
  const selectedGroup = requested !== null && Object.hasOwn(groups, requested) ? requested : undefined;

  // Tabs only report a change of tab, so clicking the selected tab leaves the URL as it is.
  function selectTab(value: string) {
    // setSearchParams pushes a history entry, so Back returns to the previous tab.
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (value === ALL_TAB) next.delete("group");
      else next.set("group", value.slice(groupTab("").length));
      return next;
    });
  }

  const sortedUsage = useMemo(() => {
    // Every group's categories, in configured group order; no categories means one shared position.
    const allCategories = Object.values(categories ?? {}).flat();
    // Array.prototype.sort is stable, so products with the same position keep stored order.
    return [...usage].sort(
      (a, b) => allCategories.indexOf(a.category) - allCategories.indexOf(b.category),
    );
  }, [usage, categories]);

  const selectedTab = selectedGroup === undefined ? ALL_TAB : groupTab(selectedGroup);
  const shownUsage = selectedGroup === undefined
    ? sortedUsage
    : sortedUsage.filter((item) => groups[selectedGroup].includes(item.category));

  return (
    <>
    <Flex justify="flex-end" mb="2">
      <Button onClick={() => openDialog()}>Add product</Button>
    </Flex>
    <Tabs.Root
      value={selectedTab}
      onValueChange={(details) => selectTab(details.value)}
    >
      <Tabs.List>
        <Tabs.Trigger value={ALL_TAB}>All</Tabs.Trigger>
        {Object.keys(groups).map((group) => (
          <Tabs.Trigger key={group} value={groupTab(group)}>{group}</Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value={selectedTab}>
        {selectedGroup !== undefined && shownUsage.length === 0 ? (
          <Text>No products in this group.</Text>
        ) : (
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Category</Table.ColumnHeader>
                <Table.ColumnHeader>Product</Table.ColumnHeader>
                <Table.ColumnHeader>Brand</Table.ColumnHeader>
                <Table.ColumnHeader>Overall Uses</Table.ColumnHeader>
                <Table.ColumnHeader>This Month's Uses</Table.ColumnHeader>
                <Table.ColumnHeader></Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {shownUsage.map((item) => (
                <Table.Row key={item.id}>
                  <Table.Cell>{item.category}</Table.Cell>
                  <Table.Cell>{productName(item)}</Table.Cell>
                  <Table.Cell>{item.brand}</Table.Cell>
                  <Table.Cell>{overallUses(item)}</Table.Cell>
                  <Table.Cell>{item.usesThisMonth}</Table.Cell>
                  <Table.Cell textAlign="end">
                    <AddMinusButtons onAddClick={() => addUsesToItems([item.id])} onMinusClick={() => removeUsesFromItems([item.id])} />
                    <Button variant="outline" ml="2" onClick={() => openDialog(item)}>Edit</Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Tabs.Content>
    </Tabs.Root>
    <ProductDialog open={dialogOpen} product={editing} categories={categories} onClose={() => setDialogOpen(false)} />
    </>
  )
}