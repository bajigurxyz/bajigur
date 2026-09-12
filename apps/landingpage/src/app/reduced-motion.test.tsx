import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

afterEach(cleanup);

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "globals.css"), "utf8");

/** Extract the brace-balanced body of the at-rule starting at `query`. */
function atRuleBody(source: string, query: string): string {
  const start = source.indexOf(query);
  expect(start, `missing "${query}" in globals.css`).toBeGreaterThan(-1);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;
    if (depth === 0) return source.slice(open + 1, i);
  }
  throw new Error(`unbalanced braces after "${query}"`);
}

describe("prefers-reduced-motion guard", () => {
  it("keeps every staggered element on an animation that ends at full opacity", () => {
    const { container } = render(<Home />);
    const hidden = Array.from(container.querySelectorAll<HTMLElement>("[style]")).filter(
      (el) => el.style.opacity === "0",
    );
    // The staggered entrance elements all start invisible…
    expect(hidden.length).toBeGreaterThan(0);
    // …so each one must carry a guarded animation class, or reduced-motion
    // users would stare at a blank page.
    for (const el of hidden) {
      expect(
        el.classList.contains("animate-fade-in-up") ||
          el.classList.contains("animate-fade-in-overlay"),
        `element <${el.tagName.toLowerCase()}> starts at opacity 0 without a guarded animation class`,
      ).toBe(true);
    }
  });

  it("shortens the entrance animations instead of cancelling them", () => {
    const guard = atRuleBody(css, "@media (prefers-reduced-motion: reduce)");
    // The rule the entrances share, up to but not including any later rule.
    const entrances = guard.slice(0, guard.indexOf("}") + 1);

    expect(entrances).toContain(".animate-fade-in-up");
    expect(entrances).toContain(".animate-fade-in-overlay");
    // These must be shortened, never cancelled: they start from an inline
    // opacity:0, so `animation: none` would leave the page blank. Animations
    // that carry no opacity, like the sponsor marquee, may be cancelled
    // outright, which is what this setting is actually for.
    expect(entrances).not.toContain("animation: none");
    expect(entrances).toContain("animation-duration");
  });

  it("ends every entrance keyframe at opacity 1 and retains it with forwards fill", () => {
    // Only the animations that fade something in. A keyframe that never touches
    // opacity has none to restore.
    for (const match of css.matchAll(/to\s*\{([^}]*)\}/g)) {
      if (!/opacity/.test(match[1])) continue;
      expect(match[1]).toMatch(/opacity:\s*1/);
    }
    expect(atRuleBody(css, ".animate-fade-in-up")).toContain("forwards");
    expect(atRuleBody(css, ".animate-fade-in-overlay")).toContain("forwards");
  });
});
