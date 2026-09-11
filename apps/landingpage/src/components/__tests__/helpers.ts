import { vi } from "vitest";

/** Clipboard stub returning the captured writeText mock — jsdom has none. */
export function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(window.navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}
