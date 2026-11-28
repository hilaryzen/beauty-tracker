import { Button, Flex, Table, Tabs, Text } from "@chakra-ui/react"
import { AddMinusButtons } from "@/components/add-minus-buttons/main";
import { ProductDialog } from "@/features/products/product-dialog";
import { formatSize, isProductSize, isRating } from "@/features/products/product-details";
import { productName } from "@/features/products/product-name";
import { isStatus, statusRank, STATUSES } from "@/features/products/product-status";
import { formatDollars } from "@/features/purchases/money";
import type { Product } from "@/features/products/types";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useUsage } from "@/features/usage/use-usage";

type InventoryTableProps = {
  usage: Product[];
  categories?: Record<string, Array<string>>
}

// Tab values: "All" cannot collide with a group, even one named "All". Groups are
// identified by position because the tabs build element ids from these values,
// and a group name may contain spaces, which ids cannot.
const ALL_TAB = "all";
const GROUP_TAB_PREFIX = "group-";
const groupTab = (index: number) => `${GROUP_TAB_PREFIX}${index}`;

// A missing or unrecognized status can only come from a hand edit; all such products share one position, after Decluttered.
function statusPosition(item: Product) {
  return isStatus(item.status) ? statusRank(item.status) : STATUSES.length;
}

function overallUses(item: Product) {
  return Object.values(item.uses).reduce((sum, value) => sum + value, 0) + item.usesThisMonth;
}

// @spec INV-UI-001, INV-UI-002, INV-UI-003, INV-UI-004, INV-UI-005, INV-UI-006, INV-UI-007, INV-UI-008, INV-UI-009, INV-UI-010, INV-UI-011, INV-UI-012, INV-UI-013, INV-UI-014, INV-UI-015, INV-UI-016, INV-UI-017, INV-UI-018, INV-UI-019, INV-UI-020, INV-UI-021, INV-UI-022, INV-UI-023, INV-UI-024, INV-UI-025, INV-UI-026, INV-UI-027, INV-UI-028, INV-UI-029, INV-UI-030, INV-UI-031, INV-UI-032, INV-UI-033, INV-UI-034, INV-UI-035, INV-UI-036, INV-UI-037, INV-UI-038, INV-UI-039, INV-UI-040, INV-UI-041, INV-UI-042, INV-LOG-001, INV-LOG-002
export const InventoryTable = ({ usage, categories }: InventoryTableProps) => {
  const { addUsesToItems, removeUsesFromItems } = useUsage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>();

  function openDialog(product?: Product) {
    setEditing(product);
    setDialogOpen(true);
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const groups = categories ?? {};
  const groupNames = Object.keys(groups);
  // The selected group comes from the URL; a name that is not a configured group selects "All".
  const requested = searchParams.get("group");
  const selectedGroup = requested !== null && Object.hasOwn(groups, requested) ? requested : undefined;

  // Tabs only report a change of tab, so clicking the selected tab leaves the URL as it is.
  function selectTab(value: string) {
    // setSearchParams pushes a history entry, so Back returns to the previous tab.
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      if (value === ALL_TAB) next.delete("group");
      else next.set("group", groupNames[Number(value.slice(GROUP_TAB_PREFIX.length))]);
      return next;
    });
  }

  const sortedUsage = useMemo(() => {
    // Every group's categories, in configured group order; no categories means one shared position.
    const allCategories = Object.values(categories ?? {}).flat();
    // Status first, then category; Array.prototype.sort is stable, so products with the same positions keep stored order.
    return [...usage].sort(
      (a, b) =>
        statusPosition(a) - statusPosition(b) ||
        allCategories.indexOf(a.category) - allCategories.indexOf(b.category),
    );
  }, [usage, categories]);

  const selectedTab = selectedGroup === undefined ? ALL_TAB : groupTab(groupNames.indexOf(selectedGroup));
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
      // Arrow keys only move focus, so passing over tabs adds no history entries.
      activationMode="manual"
      onValueChange={(details) => selectTab(details.value)}
    >
      <Tabs.List>
        <Tabs.Trigger value={ALL_TAB}>All</Tabs.Trigger>
        {groupNames.map((group, index) => (
          <Tabs.Trigger key={group} value={groupTab(index)}>{group}</Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value={selectedTab}>
        {selectedGroup !== undefined && shownUsage.length === 0 ? (
          <Text>No products in this group.</Text>
        ) : (
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Category</Table.ColumnHeader>
                <Table.ColumnHeader>Product</Table.ColumnHeader>
                <Table.ColumnHeader>Brand</Table.ColumnHeader>
                <Table.ColumnHeader>Size</Table.ColumnHeader>
                <Table.ColumnHeader>Cost</Table.ColumnHeader>
                <Table.ColumnHeader>Rating</Table.ColumnHeader>
                <Table.ColumnHeader>Overall Uses</Table.ColumnHeader>
                <Table.ColumnHeader>This Month's Uses</Table.ColumnHeader>
                <Table.ColumnHeader>Purchased</Table.ColumnHeader>
                <Table.ColumnHeader>Opened</Table.ColumnHeader>
                <Table.ColumnHeader>Expires</Table.ColumnHeader>
                <Table.ColumnHeader>Removed</Table.ColumnHeader>
                <Table.ColumnHeader></Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {shownUsage.map((item) => (
                <Table.Row key={item.id}>
                  <Table.Cell>{isStatus(item.status) ? item.status : null}</Table.Cell>
                  <Table.Cell>{item.category}</Table.Cell>
                  <Table.Cell>{productName(item)}</Table.Cell>
                  <Table.Cell>{item.brand}</Table.Cell>
                  {/* A size or rating that breaks the record rules can only come from a hand edit; its cell stays empty, as in the product dialog. */}
                  <Table.Cell>{isProductSize(item.size) ? formatSize(item.size) : null}</Table.Cell>
                  <Table.Cell>{item.purchase ? formatDollars(item.purchase.price) : null}</Table.Cell>
                  <Table.Cell>{isRating(item.rating) ? item.rating : null}</Table.Cell>
                  <Table.Cell>{overallUses(item)}</Table.Cell>
                  <Table.Cell>{item.usesThisMonth}</Table.Cell>
                  {/* Dates show as stored, YYYY-MM-DD; a missing date leaves its cell empty. */}
                  <Table.Cell>{item.purchase?.date}</Table.Cell>
                  <Table.Cell>{item.opened}</Table.Cell>
                  <Table.Cell>{item.expires}</Table.Cell>
                  <Table.Cell>{item.removed}</Table.Cell>
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