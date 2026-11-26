import { Box, Button, Heading, HStack, Input, NativeSelect, Stack, Text } from "@chakra-ui/react";
import { type KeyboardEvent, useState } from "react";
import { useRevalidator } from "react-router";
import { toaster } from "@/components/ui/toaster";
import { productName } from "@/features/products/product-name";
import { isFinished } from "@/features/products/product-status";
import type { Product } from "@/features/products/types";
import type { Categories } from "@/features/products/use-product-editor";
import { formatDate } from "@/features/purchases/format-date";
import { sendJson } from "@/utils/send-json";

export type Routines = Record<string, number[]>;

type RoutineEditorProps = {
  routines?: Routines;
  /** Used only to group the product dropdowns. */
  categories?: Categories;
  usage: Product[];
};

type OptionGroup = { category: string; options: { id: number; text: string }[] };

function matches(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function swap<T>(items: T[], index: number, other: number) {
  const next = [...items];
  [next[index], next[other]] = [next[other], next[index]];
  return next;
}

/**
 * The products that are not finished and not in `exclude`, plus the chosen product `keep` if any,
 * grouped by category: configured categories in configured order,
 * then categories that are not configured in order of first appearance. Options whose text would
 * collide show their purchase date when they have one.
 */
// @spec ROUT-EDIT-010, ROUT-EDIT-011, ROUT-EDIT-012, ROUT-EDIT-013, ROUT-EDIT-014, ROUT-EDIT-015, ROUT-EDIT-053, ROUT-EDIT-054, ROUT-EDIT-055, ROUT-EDIT-056
export function productOptions(
  usage: Product[],
  categories: Categories | undefined,
  exclude: Set<number>,
  keep?: number,
): OptionGroup[] {
  const available = usage.filter(
    (product) => product.id === keep || (!exclude.has(product.id) && !isFinished(product)),
  );
  const configured = Object.values(categories ?? {}).flat();
  const unconfigured = [...new Set(usage.map((product) => product.category))].filter((category) => !configured.includes(category));

  const textCounts = new Map<string, number>();
  for (const product of available) {
    const text = productName(product);
    textCounts.set(text, (textCounts.get(text) ?? 0) + 1);
  }
  function optionText(product: Product) {
    const text = productName(product);
    const collides = (textCounts.get(text) ?? 0) > 1;
    return collides && product.purchase ? `${text} (bought ${formatDate(product.purchase.date)})` : text;
  }

  return [...configured, ...unconfigured]
    .map((category) => ({
      category,
      options: available
        .filter((product) => product.category === category)
        .map((product) => ({ id: product.id, text: optionText(product) })),
    }))
    .filter((group) => group.options.length > 0);
}

function ProductSelect({ label, prompt, groups, value, disabled, onChange }: {
  label: string;
  prompt: string;
  groups: OptionGroup[];
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <NativeSelect.Root size="sm" disabled={disabled}>
      <NativeSelect.Field aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{prompt}</option>
        {groups.map((group) => (
          <optgroup key={group.category} label={group.category}>
            {group.options.map((option) => (
              <option key={option.id} value={option.id}>{option.text}</option>
            ))}
          </optgroup>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
}

/** Edits configs.json → routines; each edit saves at once. */
// @spec ROUT-EDIT-001, ROUT-EDIT-002, ROUT-EDIT-003, ROUT-EDIT-004, ROUT-EDIT-005, ROUT-EDIT-006, ROUT-EDIT-007, ROUT-EDIT-008, ROUT-EDIT-009, ROUT-EDIT-016, ROUT-EDIT-017, ROUT-EDIT-018, ROUT-EDIT-057
export function RoutineEditor({ routines, categories, usage }: RoutineEditorProps) {
  const { revalidate } = useRevalidator();
  const entries = Object.entries(routines ?? {});
  const names = entries.map(([name]) => name);
  const products = new Map(usage.map((product) => [product.id, product]));

  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [newName, setNewName] = useState("");
  const [firstProduct, setFirstProduct] = useState("");

  function label(id: number) {
    const product = products.get(id);
    return product ? productName(product) : `Unknown product (id ${id})`;
  }

  /**
   * Sends one `routines` value, reloads the page's data whatever the outcome, and reports a failure.
   * Calls `onSuccess` only if the edit was saved.
   */
  // @spec ROUT-EDIT-029, ROUT-EDIT-043, ROUT-EDIT-044, ROUT-EDIT-050, ROUT-EDIT-051, ROUT-EDIT-052
  async function saveRoutines(next: Routines, onSuccess?: () => void) {
    setSaving(true);
    const result = await sendJson("/api/configs", "POST", { routines: next });
    await revalidate();
    if (result.ok) onSuccess?.();
    else toaster.create({ type: "error", title: result.message });
    setSaving(false);
  }

  function withRoutine(name: string, ids: number[]): Routines {
    return Object.fromEntries(entries.map(([routine, current]) => [routine, routine === name ? ids : current]));
  }

  // --- Routines ---

  // @spec ROUT-EDIT-032, ROUT-EDIT-033, ROUT-EDIT-034
  const canAddRoutine =
    !saving && newName.trim() !== "" && firstProduct !== "" && !names.some((name) => matches(name, newName));

  // @spec ROUT-EDIT-019, ROUT-EDIT-045, ROUT-EDIT-046, ROUT-EDIT-048
  function addRoutine() {
    return saveRoutines({ ...(routines ?? {}), [newName.trim()]: [Number(firstProduct)] }, () => {
      setNewName("");
      setFirstProduct("");
    });
  }

  // @spec ROUT-EDIT-020
  function addOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && canAddRoutine) addRoutine();
  }

  // @spec ROUT-EDIT-022
  function moveRoutine(index: number, other: number) {
    return saveRoutines(Object.fromEntries(swap(entries, index, other)));
  }

  // @spec ROUT-EDIT-023
  function deleteRoutine(name: string) {
    return saveRoutines(Object.fromEntries(entries.filter(([routine]) => routine !== name)));
  }

  // --- Renaming ---

  // @spec ROUT-EDIT-035, ROUT-EDIT-041
  function startRename(name: string) {
    setRenaming(name);
    setRenameText(name);
  }

  // @spec ROUT-EDIT-036, ROUT-EDIT-037, ROUT-EDIT-038
  function canSaveRename() {
    if (renaming === null || saving) return false;
    const typed = renameText.trim();
    if (typed === "" || typed === renaming) return false;
    return !names.some((name) => name !== renaming && matches(name, typed));
  }

  // @spec ROUT-EDIT-021, ROUT-EDIT-047, ROUT-EDIT-049
  function saveRename() {
    if (renaming === null) return;
    const target = renaming;
    const typed = renameText.trim();
    const renamed = Object.fromEntries(entries.map(([name, ids]) => [name === target ? typed : name, ids]));
    return saveRoutines(renamed, () => setRenaming((current) => (current === target ? null : current)));
  }

  // @spec ROUT-EDIT-039, ROUT-EDIT-040, ROUT-EDIT-042
  function renameInput(name: string) {
    return (
      <HStack flex="1">
        <Input
          size="sm"
          aria-label={`New name for routine ${name}`}
          value={renameText}
          autoFocus
          onChange={(event) => setRenameText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canSaveRename()) saveRename();
            if (event.key === "Escape") setRenaming(null);
          }}
        />
        <Button size="sm" disabled={!canSaveRename()} onClick={saveRename}>Save</Button>
        <Button size="sm" variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
      </HStack>
    );
  }

  // --- Products in a routine ---

  // @spec ROUT-EDIT-024, ROUT-EDIT-025
  function addProduct(name: string, ids: number[], value: string) {
    if (value === "") return;
    return saveRoutines(withRoutine(name, [...ids, Number(value)]));
  }

  // @spec ROUT-EDIT-026
  function moveProduct(name: string, ids: number[], index: number, other: number) {
    return saveRoutines(withRoutine(name, swap(ids, index, other)));
  }

  // @spec ROUT-EDIT-027, ROUT-EDIT-028
  function removeProduct(name: string, ids: number[], index: number) {
    if (ids.length === 1) return deleteRoutine(name);
    return saveRoutines(withRoutine(name, ids.filter((_, position) => position !== index)));
  }

  // @spec ROUT-EDIT-030, ROUT-EDIT-031
  return (
    <Stack gap="6">
      <Heading as="h2" size="lg">Routines</Heading>
      {entries.map(([name, ids], routineIndex) => {
        const choices = productOptions(usage, categories, new Set(ids));
        return (
          <Box as="section" key={name} aria-label={`Routine ${name}`} borderWidth="1px" borderRadius="md" p="4">
            <HStack mb="3" gap="2">
              {renaming === name ? (
                renameInput(name)
              ) : (
                <Heading as="h3" size="md" flex="1">{name}</Heading>
              )}
              <Button size="sm" variant="ghost" aria-label={`Rename routine ${name}`} disabled={saving} onClick={() => startRename(name)}>Rename</Button>
              <Button size="sm" variant="ghost" aria-label={`Move routine ${name} up`} disabled={saving || routineIndex === 0} onClick={() => moveRoutine(routineIndex, routineIndex - 1)}>↑</Button>
              <Button size="sm" variant="ghost" aria-label={`Move routine ${name} down`} disabled={saving || routineIndex === entries.length - 1} onClick={() => moveRoutine(routineIndex, routineIndex + 1)}>↓</Button>
              <Button size="sm" variant="ghost" aria-label={`Delete routine ${name}`} disabled={saving} onClick={() => deleteRoutine(name)}>Delete</Button>
            </HStack>

            <Box as="ol" listStyleType="decimal" ps="6" mb="3">
              {ids.map((id, index) => {
                const product = label(id);
                return (
                  <Box as="li" key={`${index}-${id}`} mb="1">
                    <HStack gap="2">
                      <Text flex="1" data-testid="routine-product">{product}</Text>
                      <Button size="sm" variant="ghost" aria-label={`Move ${product} up in ${name}`} disabled={saving || index === 0} onClick={() => moveProduct(name, ids, index, index - 1)}>↑</Button>
                      <Button size="sm" variant="ghost" aria-label={`Move ${product} down in ${name}`} disabled={saving || index === ids.length - 1} onClick={() => moveProduct(name, ids, index, index + 1)}>↓</Button>
                      <Button size="sm" variant="ghost" aria-label={`Remove ${product} from ${name}`} disabled={saving} onClick={() => removeProduct(name, ids, index)}>Remove</Button>
                    </HStack>
                  </Box>
                );
              })}
            </Box>

            <ProductSelect
              label={`Add product to ${name}`}
              prompt="Add product…"
              groups={choices}
              value=""
              disabled={saving || choices.length === 0}
              onChange={(value) => addProduct(name, ids, value)}
            />
          </Box>
        );
      })}

      <HStack>
        <Input
          aria-label="New routine name"
          placeholder="New routine name"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={addOnEnter}
        />
        <ProductSelect
          label="First product"
          prompt="First product…"
          groups={productOptions(usage, categories, new Set(), firstProduct === "" ? undefined : Number(firstProduct))}
          value={firstProduct}
          disabled={false}
          onChange={setFirstProduct}
        />
        <Button disabled={!canAddRoutine} onClick={addRoutine}>Add routine</Button>
      </HStack>
    </Stack>
  );
}
