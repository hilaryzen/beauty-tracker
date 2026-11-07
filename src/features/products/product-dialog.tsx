import { Button, CloseButton, Dialog, Field, Input, NativeSelect, Portal, Stack } from "@chakra-ui/react";
import { type FormEvent, useState } from "react";
import type { Product } from "./types";
import { type Categories, findCategory, useProductEditor } from "./use-product-editor";

const NEW_CATEGORY = "__new_category__";
const NEW_GROUP = "__new_group__";

type ProductDialogProps = {
  open: boolean;
  /** The product to edit; adds a new product when absent. */
  product?: Product;
  categories?: Categories;
  onClose: () => void;
};

type ProductFormProps = Pick<ProductDialogProps, "product" | "categories"> & {
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
  onClose: () => void;
};

function isConfigured(categories: Categories | undefined, category: string) {
  return Object.values(categories ?? {}).flat().includes(category);
}

// Mounted only while the dialog is open, so its fields start fresh each time and
// keep their contents when the page's data refreshes.
// @spec PROD-EDIT-001, PROD-EDIT-002, PROD-EDIT-004, PROD-EDIT-005, PROD-EDIT-006, PROD-EDIT-007, PROD-EDIT-008, PROD-EDIT-009, PROD-EDIT-010, PROD-EDIT-012, PROD-EDIT-013, PROD-EDIT-014, PROD-EDIT-018, PROD-SAVE-008, PROD-SAVE-010
function ProductForm({ product, categories, saving, onSavingChange, onClose }: ProductFormProps) {
  const { saveProduct } = useProductEditor(categories);
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [category, setCategory] = useState(
    product && isConfigured(categories, product.category) ? product.category : "",
  );
  const [newCategory, setNewCategory] = useState("");
  const [group, setGroup] = useState("");
  const [newGroup, setNewGroup] = useState("");

  const isNewCategory = category === NEW_CATEGORY;
  const matched = isNewCategory ? findCategory(categories, newCategory) : undefined;
  const isNewGroup = isNewCategory && !matched && group === NEW_GROUP;

  const canSave =
    !saving &&
    name.trim() !== "" &&
    brand.trim() !== "" &&
    category !== "" &&
    (!isNewCategory ||
      (newCategory.trim() !== "" && (matched !== undefined || (group !== "" && (!isNewGroup || newGroup.trim() !== "")))));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    onSavingChange(true);
    const saved = await saveProduct({
      id: product?.id,
      name,
      brand,
      category: isNewCategory ? newCategory : category,
      group: isNewGroup ? newGroup : group,
    });
    onSavingChange(false);
    if (saved) onClose();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Dialog.Body>
        <Stack gap="4">
          <Field.Root>
            <Field.Label>Name</Field.Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field.Root>
          <Field.Root>
            <Field.Label>Brand</Field.Label>
            <Input value={brand} onChange={(event) => setBrand(event.target.value)} />
          </Field.Root>
          <Field.Root>
            <Field.Label>Category</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="" disabled>Choose a category</option>
                {Object.entries(categories ?? {})
                  .filter(([, names]) => names.length > 0)
                  .map(([groupName, names]) => (
                    <optgroup key={groupName} label={groupName}>
                      {names.map((categoryName) => (
                        <option key={categoryName} value={categoryName}>{categoryName}</option>
                      ))}
                    </optgroup>
                  ))}
                <option value={NEW_CATEGORY}>New category</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          {isNewCategory && (
            <>
              <Field.Root>
                <Field.Label>New category name</Field.Label>
                <Input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
              </Field.Root>
              <Field.Root disabled={matched !== undefined}>
                <Field.Label>Group</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={matched?.group ?? group}
                    onChange={(event) => setGroup(event.target.value)}
                  >
                    <option value="" disabled>Choose a group</option>
                    {Object.keys(categories ?? {}).map((groupName) => (
                      <option key={groupName} value={groupName}>{groupName}</option>
                    ))}
                    <option value={NEW_GROUP}>New group</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            </>
          )}
          {isNewGroup && (
            <Field.Root>
              <Field.Label>New group name</Field.Label>
              <Input value={newGroup} onChange={(event) => setNewGroup(event.target.value)} />
            </Field.Root>
          )}
        </Stack>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!canSave}>Save</Button>
      </Dialog.Footer>
    </form>
  );
}

// @spec PROD-EDIT-003, PROD-EDIT-015, PROD-EDIT-016, PROD-EDIT-017
export const ProductDialog = ({ open, product, categories, onClose }: ProductDialogProps) => {
  const [saving, setSaving] = useState(false);

  return (
    <Dialog.Root
      open={open}
      lazyMount
      unmountOnExit
      closeOnInteractOutside={false}
      closeOnEscape={!saving}
      onOpenChange={(details) => {
        if (!details.open && !saving) onClose();
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{product ? "Edit product" : "Add product"}</Dialog.Title>
            </Dialog.Header>
            <ProductForm
              product={product}
              categories={categories}
              saving={saving}
              onSavingChange={setSaving}
              onClose={onClose}
            />
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" disabled={saving} />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
