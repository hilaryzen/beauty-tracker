import type { Product } from "@/features/products/types";
import type { Categories } from "@/features/products/use-product-editor";

export type Routines = Record<string, number[]>;

type RoutineEditorProps = {
  routines?: Routines;
  categories?: Categories;
  usage: Product[];
};

// Stub: implemented in Phase 6.
export function RoutineEditor(_props: RoutineEditorProps) {
  return null;
}
