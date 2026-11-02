import { Flex, Card, HStack, List } from "@chakra-ui/react"
import type { ItemUsage } from "../usage/types";
import { AddMinusButtons } from "@/components/add-minus-buttons/main";
import { useUsage } from "../usage/use-usage";

type RoutineCardProps = {
  usage: ItemUsage[];
  routines?: Record<string, Array<number>>
}

function productName(usage: ItemUsage[], id: number) {
  return usage.find((item) => item.id === id)?.name ?? `Unknown product (id ${id})`;
}

// @spec ROUT-UI-001, ROUT-UI-002, ROUT-UI-003, ROUT-UI-004, ROUT-UI-005, ROUT-UI-006, ROUT-LOG-001, ROUT-LOG-002
export const RoutineCard = ({ usage, routines }: RoutineCardProps) => {
  const { addUsesToItems, removeUsesFromItems } = useUsage();

  return (
    <Flex>
      <HStack alignItems='stretch'>
        {Object.entries(routines ?? {}).map(([name, products]) => (
          <Card.Root width="320px" variant="subtle" key={name}>
            <Card.Body gap="2">
              <HStack>
                <Card.Title mb="2">{name}</Card.Title>
                <AddMinusButtons onAddClick={() => addUsesToItems(products)} onMinusClick={() => removeUsesFromItems(products)}/>
              </HStack>
              <List.Root as="ol">
                {products.map((id: number) => (
                  <List.Item key={id}>{productName(usage, id)}</List.Item>
                ))}
              </List.Root>
            </Card.Body>
          </Card.Root>
        ))}
      </HStack>
    </Flex>
  )
}