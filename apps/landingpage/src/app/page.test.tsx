import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

afterEach(cleanup);

describe("landing page branding", () => {
  it("renders the logo with a meaningful alt, linked home, and no inherited branding", () => {
    const { container } = render(<Home />);
    // The logo is a link home, so its alt has to be meaningful — an empty alt
    // leaves screen readers with an unnamed link.
    const logo = screen.getByRole("img", { name: "Bajigur" });
    expect(logo.getAttribute("src")).toContain("logo");
    expect(logo.closest("a")?.getAttribute("href")).toBe("/");
    // Branding this repo does not own must not survive the import.
    expect(container.textContent).not.toContain("Stellar");
    expect(container.textContent).not.toContain("Prom It");
  });

  it("carries the pay-per-prompt thesis in the headline", () => {
    render(<Home />);
    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline.textContent).toContain("Pay per prompt");
  });

  it("sends Start selling to the app origin and carries no leftover SaaS chrome", () => {
    render(<Home />);
    const sell = screen.getByRole("link", { name: "Start selling" });
    // /list lives in apps/web, a separate origin — a bare "/list" would 404 here.
    expect(sell.getAttribute("href")).toBe(`${APP_URL}/list`);
    // Tidak ada login (identitas = wallet) dan tidak ada tombol nav mati.
    expect(screen.queryByText("Log in")).toBeNull();
    expect(screen.queryByText("For Agents")).toBeNull();
    expect(screen.queryByText("Docs")).toBeNull();
  });
});

describe("landing page media", () => {
  it("loads no media from a host outside the app's own origin", () => {
    const { container } = render(<Home />);
    const urls = Array.from(container.querySelectorAll("video, source, img, audio"))
      .flatMap((el) => [el.getAttribute("src"), el.getAttribute("poster")])
      .filter((url): url is string => Boolean(url));
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      // Root-relative only: rejects absolute http(s) and protocol-relative //host.
      expect(url).toMatch(/^\/(?!\/)/);
    }
  });
});

describe("mobile menu", () => {
  it("toggles open and closed", () => {
    render(<Home />);
    expect(screen.queryByLabelText("Close menu")).toBeNull();
    expect(screen.getAllByText("Gallery")).toHaveLength(1);

    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(screen.getByLabelText("Close menu")).toBeTruthy();
    expect(screen.getAllByText("Gallery")).toHaveLength(2);

    fireEvent.click(screen.getByLabelText("Close menu"));
    expect(screen.queryByLabelText("Close menu")).toBeNull();
    expect(screen.getAllByText("Gallery")).toHaveLength(1);
  });
});
