import { waitFor } from "@testing-library/react";
import { expect } from "vitest";

/**
 * Waits until a Chakra dialog listens for Esc. Chakra's dialog (zag-js) attaches its dismiss
 * handling a microtask or an animation frame after opening, so an Esc sent sooner is ignored.
 * The same step sets the dialog content's `pointer-events` to `auto`, which marks it as done.
 */
export async function waitForEscListener(dialog: HTMLElement) {
  await waitFor(() => expect(dialog.style.pointerEvents).toBe("auto"));
}
