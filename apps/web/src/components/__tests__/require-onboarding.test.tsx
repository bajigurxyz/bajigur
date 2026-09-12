import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Onboarding } from "@/lib/useOnboarding";

const state = vi.hoisted(() => ({ current: { phase: "loading" } as Onboarding }));

vi.mock("@/lib/useOnboarding", () => ({ useOnboarding: () => state.current }));
vi.mock("@/components/Onboarding", () => ({ default: () => <div>onboarding steps</div> }));
vi.mock("@/components/WalletButton", () => ({
  default: () => <button type="button">Sign in</button>,
}));

const { default: RequireOnboarding } = await import("@/components/RequireOnboarding");

const renderGate = (next: Onboarding) => {
  state.current = next;
  return render(
    <RequireOnboarding
      title="Finish setting up"
      blurb="You need a wallet."
      signedOutBlurb="Sign in to see your prompts."
    >
      <p>the real page</p>
    </RequireOnboarding>,
  );
};

afterEach(cleanup);

describe("RequireOnboarding", () => {
  it("asks a signed-out visitor to sign in rather than showing an empty page", () => {
    renderGate({ phase: "signedOut" });

    // This page used to render nothing at all when signed out: a heading, a
    // sentence, and then white space where every section had quietly decided it
    // had no data to show.
    expect(screen.getByText("Sign in to see your prompts.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(screen.queryByText("the real page")).toBeNull();
  });

  it("shows the remaining steps to someone part way through", () => {
    renderGate({ phase: "incomplete" });

    expect(screen.getByText("onboarding steps")).toBeTruthy();
    expect(screen.queryByText("the real page")).toBeNull();
  });

  it("gets out of the way once setup is done", () => {
    renderGate({ phase: "complete", name: "axel.bajigur.eth" });

    expect(screen.getByText("the real page")).toBeTruthy();
  });

  it("decides nothing while it is still reading", () => {
    renderGate({ phase: "loading" });

    // Deciding early is how the profile came to offer activation to an account
    // that already existed.
    expect(screen.queryByText("the real page")).toBeNull();
    expect(screen.queryByText("Sign in to see your prompts.")).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
