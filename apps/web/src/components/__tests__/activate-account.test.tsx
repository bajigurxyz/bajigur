import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ActivateAccount from "../ActivateAccount";

afterEach(cleanup);

const ADDRESS = "0xA8F70558B1235769f99Add8fE665752cA18D1F8A";

describe("ActivateAccount", () => {
  it("names both faucets, and only faucets we actually send people to", () => {
    render(<ActivateAccount address={ADDRESS} />);
    expect(screen.getByRole("link", { name: /Hedera portal faucet/ }).getAttribute("href")).toBe(
      "https://portal.hedera.com/faucet",
    );
    expect(screen.getByRole("link", { name: /Circle/ }).getAttribute("href")).toBe(
      "https://faucet.circle.com/",
    );
  });

  it("asks for HBAR before USDC, because the account id does not exist until HBAR lands", () => {
    const { container } = render(<ActivateAccount address={ADDRESS} />);
    const text = container.textContent ?? "";
    expect(text.indexOf("HBAR")).toBeLessThan(text.indexOf("USDC"));
  });

  it("puts the wallet address in reach with a copy control", () => {
    render(<ActivateAccount address={ADDRESS} />);
    expect(screen.getByText(ADDRESS)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy your wallet address" })).toBeTruthy();
  });

  it("still renders its instructions when the wallet address has not loaded", () => {
    render(<ActivateAccount />);
    expect(screen.getByRole("link", { name: /Hedera portal faucet/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Copy/ })).toBeNull();
  });
});
