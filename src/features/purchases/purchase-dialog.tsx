import {
  Button,
  CloseButton,
  Dialog,
  Field,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  Portal,
  Stack,
  Text,
} from "@chakra-ui/react";
import { type FormEvent, useId, useRef, useState } from "react";
import { ProductDialog } from "@/features/products/product-dialog";
import { productName } from "@/features/products/product-name";
import { isFinished } from "@/features/products/product-status";
import type { Product } from "@/features/products/types";
import type { Categories } from "@/features/products/use-product-editor";
import { today } from "@/utils/today";
import { formatAmount, formatDollars, parseDollars } from "./money";
import { usePurchaseEditor } from "./use-purchase-editor";

const NEW_PRODUCT = "__new_product__";

type Item = { key: number; productId?: number; price: string };

/** An existing purchase to edit: its date, store, and each product's id and price in cents, in id order. */
export type EditedPurchase = { date: string; store?: string; items: { productId: number; price: number }[] };

type PurchaseDialogProps = {
  open: boolean;
  /** The purchase to edit; the dialog adds a purchase when this is absent. */
  editing?: EditedPurchase;
  usage: Product[];
  categories?: Categories;
  onClose: () => void;
};

type PurchaseFormProps = Omit<PurchaseDialogProps, "open"> & {
  /** Whether a save or delete is in flight. */
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
};

// @spec PURCH-DLG-011, PURCH-DLG-028
const productLabel = (product: Product) => `${product.brand} ${productName(product)}`;

/** The products an item can offer, in a section per category: configured categories in order, then Other. */
// @spec PURCH-DLG-008, PURCH-DLG-009, PURCH-DLG-010, PURCH-DLG-011
function productSections(usage: Product[], categories: Categories | undefined, offered: (product: Product) => boolean) {
  const configured = Object.values(categories ?? {}).flat();
  const available = usage.filter(offered);
  const sections = configured.map((category) => ({
    label: category,
    products: available.filter((product) => product.category === category),
  }));
  sections.push({ label: "Other", products: available.filter((product) => !configured.includes(product.category)) });
  return sections.filter((section) => section.products.length > 0);
}

/** Each distinct store recorded on a product's purchase. */
// @spec PURCH-DLG-004
function knownStores(usage: Product[]) {
  const stores = usage.map((product) => product.purchase?.store).filter((store) => store !== undefined);
  return [...new Set(stores)];
}

// Mounted only while the dialog is open, so its fields start fresh each time and
// keep their contents when the page's data refreshes.
// @spec PURCH-DLG-002, PURCH-DLG-033, PURCH-DLG-034, PURCH-DLG-035, PURCH-DLG-036, PURCH-DLG-039, PURCH-DLG-040, PURCH-DLG-042, PURCH-SAVE-012, PURCH-DLG-003, PURCH-DLG-008, PURCH-DLG-029, PURCH-DLG-005, PURCH-DLG-006, PURCH-DLG-007, PURCH-DLG-012, PURCH-DLG-013, PURCH-DLG-014, PURCH-DLG-015, PURCH-DLG-016, PURCH-DLG-017, PURCH-DLG-018, PURCH-DLG-019, PURCH-DLG-020, PURCH-DLG-021, PURCH-DLG-022, PURCH-DLG-027, PURCH-SAVE-004, PURCH-SAVE-006
function PurchaseForm({ editing, usage, categories, busy, onBusyChange, onClose }: PurchaseFormProps) {
  const { savePurchase, deletePurchase } = usePurchaseEditor();
  const storeListId = useId();
  // The products the edited purchase had when the dialog opened: what saving replaces and deleting removes.
  const [original] = useState(() => editing?.items.map((item) => item.productId));
  const nextKey = useRef(editing?.items.length ?? 1);
  const [date, setDate] = useState(() => editing?.date ?? today());
  const [store, setStore] = useState(editing?.store ?? "");
  const [items, setItems] = useState<Item[]>(() =>
    editing
      ? editing.items.map((item, key) => ({ key, productId: item.productId, price: formatAmount(item.price) }))
      : [{ key: 0, price: "" }],
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // The item a product is being created for, while the product dialog is open.
  const [creatingFor, setCreatingFor] = useState<number | undefined>();

  const maxDate = today();
  const prices = items.map((item) => parseDollars(item.price));
  const total = prices.reduce<number>((sum, price) => sum + (price ?? 0), 0);

  const canSave =
    !busy &&
    date !== "" &&
    date <= maxDate &&
    items.every((item) => item.productId !== undefined) &&
    prices.every((price) => price !== undefined);

  function updateItem(key: number, change: Partial<Item>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...change } : item)));
  }

  function addItem() {
    setItems((current) => [...current, { key: nextKey.current++, price: "" }]);
  }

  function removeItem(key: number) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  function chooseProduct(key: number, value: string) {
    // "New product" leaves the item's choice as it was until a product is saved.
    if (value === NEW_PRODUCT) setCreatingFor(key);
    else updateItem(key, { productId: value === "" ? undefined : Number(value) });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    onBusyChange(true);
    const draft = { date, store, items: items.map((item, index) => ({ productId: item.productId!, price: prices[index]! })) };
    const saved = await savePurchase(draft, original);
    onBusyChange(false);
    if (saved) onClose();
  }

  async function handleDelete() {
    if (busy || !original) return;
    onBusyChange(true);
    const deleted = await deletePurchase(original);
    onBusyChange(false);
    setConfirmingDelete(false);
    if (deleted) onClose();
  }

  return (
    <>
    <form onSubmit={handleSubmit}>
      <Dialog.Body>
        <Stack gap="4">
          <HStack gap="4" align="flex-start">
            <Field.Root>
              <Field.Label>Date</Field.Label>
              <Input type="date" max={maxDate} value={date} onChange={(event) => setDate(event.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Store</Field.Label>
              <Input list={storeListId} value={store} onChange={(event) => setStore(event.target.value)} />
              <datalist id={storeListId}>
                {knownStores(usage).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field.Root>
          </HStack>
          <Text fontWeight="semibold">Items</Text>
          {items.map((item, index) => {
            const chosenElsewhere = items
              .filter((other) => other.key !== item.key)
              .map((other) => other.productId);
            const sections = productSections(
              usage,
              categories,
              (product) =>
                product.id === item.productId ||
                (!chosenElsewhere.includes(product.id) &&
                  ((!product.purchase && !isFinished(product)) || (original?.includes(product.id) ?? false))),
            );
            const invalidPrice = item.price.trim() !== "" && prices[index] === undefined;
            return (
              <HStack key={item.key} gap="3" align="flex-end">
                <Field.Root flex="3">
                  <Field.Label>Product</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={item.productId === undefined ? "" : String(item.productId)}
                      onChange={(event) => chooseProduct(item.key, event.target.value)}
                    >
                      <option value="" disabled>Choose a product</option>
                      {sections.map((section) => (
                        <optgroup key={section.label} label={section.label}>
                          {section.products.map((product) => (
                            <option key={product.id} value={String(product.id)}>{productLabel(product)}</option>
                          ))}
                        </optgroup>
                      ))}
                      <option value={NEW_PRODUCT}>New product</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root flex="1" invalid={invalidPrice}>
                  <Field.Label>Price</Field.Label>
                  <Input
                    inputMode="decimal"
                    placeholder="$0.00"
                    value={item.price}
                    onChange={(event) => updateItem(item.key, { price: event.target.value })}
                  />
                </Field.Root>
                <IconButton
                  aria-label="Remove item"
                  variant="ghost"
                  disabled={items.length === 1}
                  onClick={() => removeItem(item.key)}
                >
                  ✕
                </IconButton>
              </HStack>
            );
          })}
          <HStack justify="space-between">
            <Button variant="outline" size="sm" onClick={addItem}>Add item</Button>
            <Text fontWeight="semibold">{`Total ${formatDollars(total)}`}</Text>
          </HStack>
        </Stack>
      </Dialog.Body>
      <Dialog.Footer>
        {original && (
          <Button variant="outline" colorPalette="red" me="auto" disabled={busy} onClick={() => setConfirmingDelete(true)}>
            Delete
          </Button>
        )}
        <Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!canSave}>Save</Button>
      </Dialog.Footer>
    </form>
    {/* Outside the form: React passes events up through portals, so a nested form would submit this one too. */}
    <ProductDialog
        open={creatingFor !== undefined}
        categories={categories}
        onClose={() => setCreatingFor(undefined)}
        onSaved={(id) => {
          if (creatingFor !== undefined) updateItem(creatingFor, { productId: id });
        }}
      />
    <DeleteConfirmation
      open={confirmingDelete}
      busy={busy}
      onCancel={() => setConfirmingDelete(false)}
      onConfirm={handleDelete}
    />
    </>
  );
}

type DeleteConfirmationProps = { open: boolean; busy: boolean; onCancel: () => void; onConfirm: () => void };

// @spec PURCH-DLG-037, PURCH-DLG-038, PURCH-DLG-043, PURCH-DLG-044, PURCH-SAVE-011
function DeleteConfirmation({ open, busy, onCancel, onConfirm }: DeleteConfirmationProps) {
  return (
    <Dialog.Root
      open={open}
      role="alertdialog"
      closeOnInteractOutside={false}
      closeOnEscape={!busy}
      onOpenChange={(details) => {
        if (!details.open && !busy) onCancel();
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete this purchase?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>Its products will have no purchase, so each can be bought again.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>
              <Button colorPalette="red" disabled={busy} onClick={onConfirm}>Delete</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" disabled={busy} />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

// @spec PURCH-DLG-023, PURCH-DLG-024, PURCH-DLG-025, PURCH-DLG-026, PURCH-DLG-031, PURCH-DLG-032, PURCH-DLG-041
export function PurchaseDialog({ open, editing, usage, categories, onClose }: PurchaseDialogProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Dialog.Root
      open={open}
      size="lg"
      lazyMount
      unmountOnExit
      closeOnInteractOutside={false}
      closeOnEscape={!busy}
      onOpenChange={(details) => {
        if (!details.open && !busy) onClose();
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{editing ? "Edit purchase" : "Add purchase"}</Dialog.Title>
            </Dialog.Header>
            <PurchaseForm
              editing={editing}
              usage={usage}
              categories={categories}
              busy={busy}
              onBusyChange={setBusy}
              onClose={onClose}
            />
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" disabled={busy} />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
