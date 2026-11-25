import { Box, Button, Heading, HStack, Input, NativeSelect, Stack, Text } from "@chakra-ui/react";
import { type KeyboardEvent, useState } from "react";
import { useRevalidator } from "react-router";
import { toaster } from "@/components/ui/toaster";
import { sendJson } from "@/utils/send-json";
import type { Product } from "./types";
import type { Categories } from "./use-product-editor";

type CategoryEditorProps = {
  categories?: Categories;
  /** Used only to count the products in each category. */
  usage: Product[];
};

type Renaming = { kind: "group" | "category"; name: string };

function matches(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function swap<T>(items: T[], index: number, other: number) {
  const next = [...items];
  [next[index], next[other]] = [next[other], next[index]];
  return next;
}

function productCount(count: number) {
  return count === 1 ? "1 product" : `${count} products`;
}

/** Edits configs.json → categories; each edit saves at once. */
// @spec PROD-CATEDIT-001, PROD-CATEDIT-002, PROD-CATEDIT-003, PROD-CATEDIT-004, PROD-CATEDIT-005, PROD-CATEDIT-006, PROD-CATEDIT-007, PROD-CATEDIT-008, PROD-CATEDIT-043
export function CategoryEditor({ categories, usage }: CategoryEditorProps) {
  const { revalidate } = useRevalidator();
  const groups = Object.entries(categories ?? {});
  const groupNames = groups.map(([group]) => group);
  const allCategories = groups.flatMap(([, names]) => names);

  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState<Renaming | null>(null);
  const [renameText, setRenameText] = useState("");
  const [newCategories, setNewCategories] = useState<Record<string, string>>({});
  const [newGroup, setNewGroup] = useState("");

  const counts = new Map<string, number>();
  for (const product of usage) counts.set(product.category, (counts.get(product.category) ?? 0) + 1);

  /**
   * Sends one edit, reloads the page's data whatever the outcome, and reports a failure.
   * Calls `onSuccess` only if the edit was saved.
   */
  // @spec PROD-CATEDIT-035, PROD-CATEDIT-036, PROD-CATEDIT-039, PROD-CATEDIT-040, PROD-CATEDIT-041, PROD-CATEDIT-042
  async function save(url: string, body: unknown, onSuccess?: () => void) {
    setSaving(true);
    const result = await sendJson(url, "POST", body);
    await revalidate();
    if (result.ok) onSuccess?.();
    else toaster.create({ type: "error", title: result.message });
    setSaving(false);
  }

  // @spec PROD-CATEDIT-009, PROD-CATEDIT-010, PROD-CATEDIT-011, PROD-CATEDIT-012, PROD-CATEDIT-013, PROD-CATEDIT-014, PROD-CATEDIT-015, PROD-CATEDIT-016
  function saveCategories(next: Categories, onSuccess?: () => void) {
    return save("/api/configs", { categories: next }, onSuccess);
  }

  function withGroup(group: string, names: string[]): Categories {
    return Object.fromEntries(groups.map(([name, current]) => [name, name === group ? names : current]));
  }

  // --- Adding ---

  // @spec PROD-CATEDIT-023, PROD-CATEDIT-024
  function canAddCategory(group: string) {
    const typed = (newCategories[group] ?? "").trim();
    return !saving && typed !== "" && !allCategories.some((name) => matches(name, typed));
  }

  function addCategory(group: string) {
    const typed = (newCategories[group] ?? "").trim();
    const names = categories?.[group] ?? [];
    return saveCategories(withGroup(group, [...names, typed]), () =>
      setNewCategories((current) => ({ ...current, [group]: "" })),
    );
  }

  // @spec PROD-CATEDIT-025, PROD-CATEDIT-026
  const canAddGroup = !saving && newGroup.trim() !== "" && !groupNames.some((name) => matches(name, newGroup));

  function addGroup() {
    return saveCategories({ ...(categories ?? {}), [newGroup.trim()]: [] }, () => setNewGroup(""));
  }

  // @spec PROD-CATEDIT-044, PROD-CATEDIT-045
  function submitOnEnter(enabled: boolean, submit: () => void) {
    return (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && enabled) submit();
    };
  }

  // --- Renaming ---

  // @spec PROD-CATEDIT-027, PROD-CATEDIT-034
  function startRename(target: Renaming) {
    setRenaming(target);
    setRenameText(target.name);
  }

  // @spec PROD-CATEDIT-028, PROD-CATEDIT-029, PROD-CATEDIT-030, PROD-CATEDIT-031
  function canSaveRename() {
    if (!renaming || saving) return false;
    const typed = renameText.trim();
    if (typed === "" || typed === renaming.name) return false;
    const others = (renaming.kind === "group" ? groupNames : allCategories).filter((name) => name !== renaming.name);
    return !others.some((name) => matches(name, typed));
  }

  // @spec PROD-CATEDIT-011, PROD-CATEDIT-017, PROD-CATEDIT-038
  function saveRename() {
    if (!renaming) return;
    const target = renaming;
    const typed = renameText.trim();
    const closeInput = () => setRenaming((current) => (current === target ? null : current));
    if (target.kind === "category") {
      return save("/api/categories", { from: target.name, to: typed }, closeInput);
    }
    const renamed = Object.fromEntries(groups.map(([group, names]) => [group === target.name ? typed : group, names]));
    return saveCategories(renamed, closeInput);
  }

  // @spec PROD-CATEDIT-032, PROD-CATEDIT-033, PROD-CATEDIT-046
  function renameInput(target: Renaming) {
    return (
      <HStack flex="1">
        <Input
          size="sm"
          aria-label={`New name for ${target.name}`}
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

  function isRenaming(kind: Renaming["kind"], name: string) {
    return renaming?.kind === kind && renaming.name === name;
  }

  // --- Moving and deleting ---

  function moveGroup(index: number, other: number) {
    return saveCategories(Object.fromEntries(swap(groups, index, other)));
  }

  function moveCategory(group: string, index: number, other: number) {
    return saveCategories(withGroup(group, swap(categories?.[group] ?? [], index, other)));
  }

  function moveCategoryTo(category: string, from: string, to: string) {
    const next = Object.fromEntries(
      groups.map(([group, names]) => {
        if (group === from) return [group, names.filter((name) => name !== category)];
        if (group === to) return [group, [...names, category]];
        return [group, names];
      }),
    );
    return saveCategories(next);
  }

  function deleteCategory(group: string, category: string) {
    return saveCategories(withGroup(group, (categories?.[group] ?? []).filter((name) => name !== category)));
  }

  function deleteGroup(group: string) {
    return saveCategories(Object.fromEntries(groups.filter(([name]) => name !== group)));
  }

  // @spec PROD-CATEDIT-018, PROD-CATEDIT-019, PROD-CATEDIT-020, PROD-CATEDIT-021, PROD-CATEDIT-022
  return (
    <Stack gap="6">
      <Heading as="h2" size="lg">Categories</Heading>
      {groups.map(([group, names], groupIndex) => (
        <Box as="section" key={group} aria-label={group} borderWidth="1px" borderRadius="md" p="4">
          <HStack mb="3" gap="2">
            {isRenaming("group", group) ? (
              renameInput({ kind: "group", name: group })
            ) : (
              <Heading as="h3" size="md" flex="1">{group}</Heading>
            )}
            <Button size="sm" variant="ghost" aria-label={`Rename group ${group}`} disabled={saving} onClick={() => startRename({ kind: "group", name: group })}>Rename</Button>
            <Button size="sm" variant="ghost" aria-label={`Move group ${group} up`} disabled={saving || groupIndex === 0} onClick={() => moveGroup(groupIndex, groupIndex - 1)}>↑</Button>
            <Button size="sm" variant="ghost" aria-label={`Move group ${group} down`} disabled={saving || groupIndex === groups.length - 1} onClick={() => moveGroup(groupIndex, groupIndex + 1)}>↓</Button>
            <Button size="sm" variant="ghost" aria-label={`Delete group ${group}`} disabled={saving || names.length > 0} onClick={() => deleteGroup(group)}>Delete</Button>
          </HStack>

          {names.length > 0 && (
            <Stack as="ul" listStyleType="none" gap="2" mb="3">
              {names.map((category, index) => (
                <HStack as="li" key={category} gap="2">
                  {isRenaming("category", category) ? (
                    renameInput({ kind: "category", name: category })
                  ) : (
                    <HStack flex="1" gap="3">
                      <Text data-testid="category-name">{category}</Text>
                      <Text color="fg.muted" fontSize="sm">{productCount(counts.get(category) ?? 0)}</Text>
                    </HStack>
                  )}
                  <Button size="sm" variant="ghost" aria-label={`Rename category ${category}`} disabled={saving} onClick={() => startRename({ kind: "category", name: category })}>Rename</Button>
                  <Button size="sm" variant="ghost" aria-label={`Move category ${category} up`} disabled={saving || index === 0} onClick={() => moveCategory(group, index, index - 1)}>↑</Button>
                  <Button size="sm" variant="ghost" aria-label={`Move category ${category} down`} disabled={saving || index === names.length - 1} onClick={() => moveCategory(group, index, index + 1)}>↓</Button>
                  <NativeSelect.Root size="sm" width="auto" disabled={saving || groups.length < 2}>
                    <NativeSelect.Field
                      aria-label={`Move category ${category} to`}
                      value=""
                      onChange={(event) => event.target.value && moveCategoryTo(category, group, event.target.value)}
                    >
                      <option value="">Move to…</option>
                      {groupNames.filter((name) => name !== group).map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                  <Button size="sm" variant="ghost" aria-label={`Delete category ${category}`} disabled={saving || (counts.get(category) ?? 0) > 0} onClick={() => deleteCategory(group, category)}>Delete</Button>
                </HStack>
              ))}
            </Stack>
          )}

          <HStack>
            <Input
              size="sm"
              aria-label={`New category in ${group}`}
              placeholder="New category name"
              value={newCategories[group] ?? ""}
              onChange={(event) => setNewCategories((current) => ({ ...current, [group]: event.target.value }))}
              onKeyDown={submitOnEnter(canAddCategory(group), () => addCategory(group))}
            />
            <Button size="sm" aria-label={`Add category to ${group}`} disabled={!canAddCategory(group)} onClick={() => addCategory(group)}>Add</Button>
          </HStack>
        </Box>
      ))}

      <HStack>
        <Input
          aria-label="New group name"
          placeholder="New group name"
          value={newGroup}
          onChange={(event) => setNewGroup(event.target.value)}
          onKeyDown={submitOnEnter(canAddGroup, addGroup)}
        />
        <Button disabled={!canAddGroup} onClick={addGroup}>Add group</Button>
      </HStack>
    </Stack>
  );
}
