import { Box, Container, Grid, Heading } from "@chakra-ui/react";
import type { Route } from "./+types/settings";
import { CategoryEditor } from "@/features/products/category-editor";
import type { Product } from "@/features/products/types";
import type { Categories } from "@/features/products/use-product-editor";
import { RoutineEditor, type Routines } from "@/features/routine/routine-editor";
import { getFile } from "@/utils/files.server";

// Reads usage.json directly, not through usage's loader, so loading this page applies no rollover.
// @spec SHELL-SET-002, SHELL-SET-003, SHELL-SET-004
export async function loader() {
  const configs = await getFile("configs.json");
  const usage: Product[] | undefined = await getFile("usage.json");
  if (configs === undefined || usage === undefined) {
    throw new Response(null, { status: 500, statusText: "Your data could not be loaded." });
  }
  return {
    usage,
    categories: configs.categories as Categories | undefined,
    routines: configs.routines as Routines | undefined,
  };
}

// The category editor comes first in the source so keyboard focus follows the wide layout;
// narrow windows move the routine editor up visually.
// @spec SHELL-SET-001, SHELL-SET-002, SHELL-SET-005, SHELL-SET-006, SHELL-SET-007
export default function Settings({ loaderData }: Route.ComponentProps) {
  return (
    <Container as="main" pt="8" pb="4">
      <Heading as="h1" size="2xl" mb="6">Settings</Heading>
      <Grid
        data-testid="settings-editors"
        gridTemplateColumns={{ base: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }}
        gap="10"
        alignItems="start"
      >
        <Box data-testid="settings-categories">
          <CategoryEditor categories={loaderData.categories} usage={loaderData.usage} />
        </Box>
        <Box data-testid="settings-routines" order={{ base: -1, lg: 0 }}>
          <RoutineEditor routines={loaderData.routines} categories={loaderData.categories} usage={loaderData.usage} />
        </Box>
      </Grid>
    </Container>
  );
}
