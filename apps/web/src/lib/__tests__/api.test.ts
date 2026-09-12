import { describe, expect, it } from "vitest";
import { formatHbar, formatUsd, type Prompt, tagsOf } from "../api";

const prompt = (id: string, tags: string[]): Prompt => ({
  id,
  title: id,
  tags,
  preview: "",
  priceUsd: "0.10",
  priceHbar: "1",
});

describe("tagsOf", () => {
  it("collects every distinct tag in first-seen order", () => {
    expect(tagsOf([prompt("a", ["hero", "gsap"]), prompt("b", ["gsap", "nav"])])).toEqual([
      "hero",
      "gsap",
      "nav",
    ]);
  });

  it("is empty for an empty catalogue", () => {
    expect(tagsOf([])).toEqual([]);
  });
});

describe("price formatting", () => {
  // The API sends decimal strings, not atomic units, so formatting must not
  // rescale them — a prompt priced "0.02" is two cents, never two dollars.
  it("keeps the API's decimal string intact", () => {
    expect(formatUsd("0.02")).toBe("$0.02");
    expect(formatUsd("0.10")).toBe("$0.10");
    expect(formatHbar("0.2")).toBe("0.2 ℏ");
  });
});
