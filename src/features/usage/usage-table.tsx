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
import { useUsage } from "./use-usage";

type UsageTableProps = {
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

// @spec USAGE-UI-001, USAGE-UI-002, USAGE-UI-003, USAGE-UI-004, USAGE-UI-005, USAGE-UI-006, USAGE-UI-007, USAGE-UI-008, USAGE-UI-009, USAGE-UI-010, USAGE-UI-011, USAGE-UI-012, USAGE-UI-013, USAGE-UI-014, USAGE-UI-015, USAGE-UI-016, USAGE-UI-017, USAGE-UI-018, USAGE-UI-019, USAGE-UI-020, USAGE-UI-021, USAGE-UI-022, USAGE-UI-023, USAGE-UI-024, USAGE-UI-025, USAGE-UI-026, USAGE-UI-027, USAGE-UI-028, USAGE-UI-029, USAGE-UI-030, USAGE-UI-031, USAGE-UI-032, USAGE-UI-033, USAGE-UI-034, USAGE-UI-035, USAGE-UI-036, USAGE-UI-037, USAGE-UI-038, USAGE-UI-039, USAGE-UI-040, USAGE-UI-041, USAGE-UI-042, USAGE-LOG-001, USAGE-LOG-002
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