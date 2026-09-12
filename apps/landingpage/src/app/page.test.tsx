import { cleanup, render, screen } from "@testing-library/react";
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

  it("sends people into the app through the hero, and nowhere that 404s", () => {
    render(<Home />);
    const cta = screen.getByRole("link", { name: "Explore the gallery" });
    // apps/web is a separate origin, so a bare "/prompts" would 404 here.
    expect(cta.getAttribute("href")).toBe(`${APP_URL}/prompts`);

    // apps/web has no creator listing or earnings surface, and the API has no
    // endpoint behind either. A link to one would be a dead promise.
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href") ?? "");
    for (const dead of ["/list", "/earnings"]) {
      expect(links.some((href) => href.endsWith(dead))).toBe(false);
    }
    // Tidak ada login (identitas = wallet) dan tidak ada tombol nav mati.
    expect(screen.queryByText("Log in")).toBeNull();
    expect(screen.queryByText("For Agents")).toBeNull();
    expect(screen.queryByText("Docs")).toBeNull();
  });
});

/**
 * Our own bucket, the one apps/web renders creator previews from. The chat
 * transcript ends in a real listing's recording, and copying it here would be a
 * second thing to keep in step with the listing every time it changes.
 */
const CATALOGUE_BUCKET = "https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/";

/**
 * Sponsor marks, served by the event. Other people's trademarks are better
 * fetched than copied: a copy in our repo goes stale the day a brand changes.
 */
const SPONSOR_CDN = "https://cdn.ethglobal.com/";

describe("landing page media", () => {
  it("loads no media from a host we do not control", () => {
    const { container } = render(<Home />);
    const urls = Array.from(container.querySelectorAll("video, source, img, audio"))
      .flatMap((el) => [el.getAttribute("src"), el.getAttribute("poster")])
      .filter((url): url is string => Boolean(url));
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      // Root-relative, our own origin, or the catalogue bucket. Rejects every
      // other absolute host and any protocol-relative //host. next/image
      // resolves a local src to an absolute same-origin URL under jsdom, which
      // is still ours.
      if (url.startsWith(CATALOGUE_BUCKET) || url.startsWith(SPONSOR_CDN)) continue;
      if (url.startsWith(`${window.location.origin}/`)) continue;
      expect(url).toMatch(/^\/(?!\/)/);
    }
  });
});

describe("header", () => {
  it("carries the logo and no application navigation", () => {
    render(<Home />);
    expect(screen.getByRole("img", { name: "Bajigur" })).toBeTruthy();
    // These belong to apps/web. On the landing page they would be chrome for
    // an app the visitor has not entered yet.
    for (const label of ["Gallery", "My licences", "Connect", "Connect your agent"]) {
      expect(screen.queryByRole("link", { name: label })).toBeNull();
    }
    expect(screen.queryByLabelText("Open menu")).toBeNull();
  });
});
