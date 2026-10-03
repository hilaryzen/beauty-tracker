import { Box, Card, List } from "@chakra-ui/react"
import type { ItemUsage } from "../usage/types";

type RoutineCardProps = {
  usage: ItemUsage[];
  routines: Record<string, Array<number>>
}

export const RoutineCard = ({ usage, routines }: RoutineCardProps) => {
  return (
    <Box>
      {Object.entries(routines).map(([name, products]) => (
        <Card.Root width="320px" variant="subtle" key={name}>
          <Card.Body gap="2">
            <Card.Title mb="2">{name}</Card.Title>
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
    </Box>
  )
}