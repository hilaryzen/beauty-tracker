import { Table } from "@chakra-ui/react"
import { useImportData } from "@/hooks/import-data"
import { AddMinusButtons } from "@/components/add-minus-buttons/main";

export const UsageTable = () => {
  const { usage, setUsage } = useImportData();

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
    setUsage(newUsage);
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
    setUsage(newUsage);
  }

  return (
    <Table.Root size="sm">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Product</Table.ColumnHeader>
          <Table.ColumnHeader>Brand</Table.ColumnHeader>
          <Table.ColumnHeader>Overall Uses</Table.ColumnHeader>
          <Table.ColumnHeader>This Month's Uses</Table.ColumnHeader>
          <Table.ColumnHeader></Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {usage.map((item, index) => (
          <Table.Row key={item.id}>
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