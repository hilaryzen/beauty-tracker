import { Box, Card, HStack, List } from "@chakra-ui/react"
import type { ItemUsage } from "../usage/types";
import { AddMinusButtons } from "@/components/add-minus-buttons/main";
import { useUsage } from "../usage/use-usage";

type RoutineCardProps = {
  usage: ItemUsage[];
  routines: Record<string, Array<number>>
}

export const RoutineCard = ({ usage, routines }: RoutineCardProps) => {
  const { addUsesToItems, removeUsesFromItems } = useUsage(usage);

  return (
    <Box>
      <HStack align="flex-start">
        {Object.entries(routines).map(([name, products]) => (
          <Card.Root width="320px" variant="subtle" key={name}>
            <Card.Body gap="2">
              <HStack>
                <Card.Title mb="2">{name}</Card.Title>
                <AddMinusButtons onAddClick={() => addUsesToItems(products)} onMinusClick={() => removeUsesFromItems(products)}/>
              </HStack>
              <List.Root as="ol">
                {products.map((id: number) => (
                  <List.Item key={id}>{usage[id].name}</List.Item>
                ))}
              </List.Root>
            </Card.Body>
            <Card.Footer justifyContent="flex-end">
            </Card.Footer>
          </Card.Root>
        ))}
      </HStack>
    </Box>
  )
}