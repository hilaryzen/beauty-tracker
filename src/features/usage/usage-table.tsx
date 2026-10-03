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
          uses: item.uses + 1
        };
      } else {
        return item;
      }
    });
    console.log(newUsage);
    setUsage(newUsage);
  }

  function removeUseFromItem(index: number) {
    const newUsage = usage.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          uses: item.uses - 1
        };
      } else {
        return item;
      }
    });
    console.log(newUsage);
    setUsage(newUsage);
  }

  return (
    <Table.Root size="sm">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Product</Table.ColumnHeader>
          <Table.ColumnHeader>Brand</Table.ColumnHeader>
          <Table.ColumnHeader>Uses</Table.ColumnHeader>
          <Table.ColumnHeader textAlign="end">Add</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {usage.map((item, index) => (
          <Table.Row key={item.id}>
            <Table.Cell>{item.name}</Table.Cell>
            <Table.Cell>{item.brand}</Table.Cell>
            <Table.Cell>{item.uses}</Table.Cell>
            <Table.Cell textAlign="end"><AddMinusButtons onAddClick={() => addUseToItem(index)} onMinusClick={() => removeUseFromItem(index)} /></Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}