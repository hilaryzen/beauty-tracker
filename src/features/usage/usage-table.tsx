import { Table } from "@chakra-ui/react"
import { AddMinusButtons } from "@/components/add-minus-buttons/main";
import type { Product } from "@/features/products/types";
import { useMemo } from "react";
import { useUsage } from "./use-usage";

type UsageTableProps = {
  usage: Product[];
  categories?: Record<string, Array<string>>
}

function overallUses(item: Product) {
  return Object.values(item.uses).reduce((sum, value) => sum + value, 0) + item.usesThisMonth;
}

// @spec USAGE-UI-001, USAGE-UI-002, USAGE-UI-003, USAGE-UI-004, USAGE-UI-005, USAGE-UI-006, USAGE-LOG-001, USAGE-LOG-002
export const UsageTable = ({ usage, categories }: UsageTableProps) => {
  const { addUsesToItems, removeUsesFromItems } = useUsage();

  const sortedUsage = useMemo(() => {
    // Every group's categories, in configured group order; no categories means one shared position.
    const allCategories = Object.values(categories ?? {}).flat();
    // Array.prototype.sort is stable, so products with the same position keep stored order.
    return [...usage].sort(
      (a, b) => allCategories.indexOf(a.category) - allCategories.indexOf(b.category),
    );
  }, [usage, categories]);

  return (
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
        {sortedUsage.map((item) => (
          <Table.Row key={item.id}>
            <Table.Cell>{item.category}</Table.Cell>
            <Table.Cell>{item.name}</Table.Cell>
            <Table.Cell>{item.brand}</Table.Cell>
            <Table.Cell>{overallUses(item)}</Table.Cell>
            <Table.Cell>{item.usesThisMonth}</Table.Cell>
            <Table.Cell textAlign="end"><AddMinusButtons onAddClick={() => addUsesToItems([item.id])} onMinusClick={() => removeUsesFromItems([item.id])} /></Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}