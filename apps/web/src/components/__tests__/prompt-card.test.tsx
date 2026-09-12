import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Prompt } from "@/lib/api";
import PromptCard from "../PromptCard";

afterEach(cleanup);

const prompt: Prompt = {
  id: "marquee-logos",
  title: "Infinite logo marquee",
  tags: ["marquee", "css"],
  preview: "Seamless infinite logo strip in pure CSS.",
  priceUsd: "0.02",
  priceHbar: "0.2",
  creator: "kiel.bajigur.eth",
  payTo: "0.0.7275085",
};

describe("PromptCard", () => {
  it("shows both prices, the creator, and every tag", () => {
    render(<PromptCard prompt={prompt} />);
    expect(screen.getByText("Infinite logo marquee")).toBeTruthy();
    expect(screen.getByText("kiel.bajigur.eth")).toBeTruthy();
    expect(screen.getByText("marquee")).toBeTruthy();
    expect(screen.getByText("css")).toBeTruthy();
    const price = screen.getByLabelText("Price: $0.02 in USDC, or 0.2 HBAR");
    expect(price.textContent).toContain("$0.02");
  });

  it("never renders the prompt body — the catalogue must not carry paid text", () => {
    const { container } = render(<PromptCard prompt={prompt} />);
    expect(container.textContent).toContain(prompt.preview);
    expect(Object.keys(prompt)).not.toContain("body");
  });

  it("keeps the unlock control in the layout rather than behind a hover", () => {
    render(<PromptCard prompt={prompt} />);
    const unlock = screen.getByRole("link", { name: /Unlock Infinite logo marquee/ });
    // Hover-reveal hides actions from keyboard, touch and AT users alike.
    expect(unlock.className).not.toMatch(/opacity-0|group-hover:/);
  });
});
