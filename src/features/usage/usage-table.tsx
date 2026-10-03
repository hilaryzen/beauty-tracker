import { Table } from "@chakra-ui/react"
import { AddMinusButtons } from "@/components/add-minus-buttons/main";
import { useFetcher } from "react-router";
import type { ItemUsage } from "./types";
import { useMemo } from "react";

type UsageTableProps = {
  usage: ItemUsage[];
  configs: Record<string, Array<string>>
}

export const UsageTable = ({ usage, configs }: UsageTableProps) => {
  const sortedUsage = useMemo(() => {
    // Make a copy to avoid mutating state, then sort
    return [...usage].sort((a, b) => {
      const indexA = configs.makeupCategories.indexOf(a.category);
      const indexB = configs.makeupCategories.indexOf(b.category);
      // Compare the positions in the reference array
      return indexA - indexB;
    });
  }, [usage]);
  
  const fetcher = useFetcher();
  function submitUsage(newUsage: ItemUsage[]) {
    fetcher.submit(newUsage, {
      method: "post",
      action: "/api/usage",
      encType: "application/json",
    });
  }

  function addUseToItem(index: number) {
    const newUsage = usage.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          usesThisMonth: item.usesThisMonth + 1
        };
      } else {
        return item;
      }
    });
    submitUsage(newUsage);
  }

  function removeUseFromItem(index: number) {
    const newUsage = usage.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          usesThisMonth: item.usesThisMonth - 1
        };
      } else {
        return item;
      }
    });
    submitUsage(newUsage);
  }

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
        {sortedUsage.map((item, index) => (
          <Table.Row key={item.id}>
            <Table.Cell>{item.category}</Table.Cell>
            <Table.Cell>{item.name}</Table.Cell>
            <Table.Cell>{item.brand}</Table.Cell>
            <Table.Cell>{Object.values(item.uses).reduce((sum, value) => sum + value, 0)}</Table.Cell>
            <Table.Cell>{item.usesThisMonth}</Table.Cell>
            <Table.Cell textAlign="end"><AddMinusButtons onAddClick={() => addUseToItem(index)} onMinusClick={() => removeUseFromItem(index)} /></Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}