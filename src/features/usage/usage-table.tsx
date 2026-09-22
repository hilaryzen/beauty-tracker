import { Button, Table } from "@chakra-ui/react"
import { useImportData } from "@/hooks/import-data"

export const UsageTable = () => {
  const { usage } = useImportData();

  return (
    <Table.Root size="sm">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Product</Table.ColumnHeader>
          <Table.ColumnHeader>Brand</Table.ColumnHeader>
          <Table.ColumnHeader textAlign="end">Add</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {usage.map((item) => (
          <Table.Row key={item.id}>
            <Table.Cell>{item.name}</Table.Cell>
            <Table.Cell>{item.brand}</Table.Cell>
            <Table.Cell textAlign="end"><Button>+</Button></Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}