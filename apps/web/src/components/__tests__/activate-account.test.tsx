import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ActivateAccount from "../ActivateAccount";

afterEach(cleanup);

describe("ActivateAccount", () => {
  it("leads with setting up payments, which does the whole thing", () => {
    render(<ActivateAccount />);
    const cta = screen.getByRole("link", { name: "Set up payments" });
    expect(cta.getAttribute("href")).toBe("/connect");
  });

  it("keeps the manual faucet as a fallback, not the instruction", () => {
    const { container } = render(<ActivateAccount />);
    const text = container.textContent ?? "";
    // apps/api funds the account on connect, so a faucet is the way out when
    // the platform account runs dry, not the first thing to try.
    expect(text.indexOf("Set up payments")).toBeLessThan(text.indexOf("Rather do it yourself"));
    expect(screen.getByRole("link", { name: /Hedera portal faucet/ }).getAttribute("href")).toBe(
      "https://portal.hedera.com/faucet",
    );
  });

  it("does not send anyone to Circle before an account exists", () => {
    const { container } = render(<ActivateAccount />);
    // USDC needs an account id, which does not exist yet at this point.
    expect(container.textContent).not.toContain("faucet.circle.com");
  });
});
