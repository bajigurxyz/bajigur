import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isActive } from "@/components/NavLinks";

const path = vi.hoisted(() => ({ current: "/prompts" }));
vi.mock("next/navigation", () => ({ usePathname: () => path.current }));

const { default: NavLinks } = await import("@/components/NavLinks");

const renderAt = (pathname: string) => {
  path.current = pathname;
  return render(<NavLinks />);
};

afterEach(cleanup);

describe("which link counts as the page you are on", () => {
  it("stays lit on a child route", () => {
    // A prompt's own page is still the marketplace as far as the nav is
    // concerned; losing the marker there makes the nav look broken.
    expect(isActive("/prompts/nova-ai-cinematic-landing", "/prompts")).toBe(true);
  });

  it("does not treat a shared prefix as a match", () => {
    // "/my-prompts" begins with "/my-prompt", and a naive startsWith would
    // light both. The separator is what keeps them apart.
    expect(isActive("/my-prompts", "/prompts")).toBe(false);
    expect(isActive("/prompts-archive", "/prompts")).toBe(false);
  });

  it("marks nothing on a route that is not in the nav", () => {
    expect(isActive("/connect", "/prompts")).toBe(false);
    expect(isActive("/connect", "/profile")).toBe(false);
  });
});

describe("NavLinks", () => {
  it("tells assistive tech which page it is on, not just which link is darker", () => {
    renderAt("/profile");

    expect(screen.getByRole("link", { name: "Profile" }).getAttribute("aria-current")).toBe("page");
    expect(
      screen.getByRole("link", { name: "Marketplace" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("carries the marker through to a prompt's own page", () => {
    renderAt("/prompts/core-features-tabs");

    expect(screen.getByRole("link", { name: "Marketplace" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("marks nothing when the route is not one of its own", () => {
    renderAt("/connect");

    for (const label of ["Marketplace", "My prompts", "Profile"]) {
      expect(screen.getByRole("link", { name: label }).getAttribute("aria-current")).toBeNull();
    }
  });
});
