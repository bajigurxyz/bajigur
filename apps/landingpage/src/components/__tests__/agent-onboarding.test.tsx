import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "@/app/page";
import AgentOnboarding, { ONBOARDING_TARGETS } from "../AgentOnboarding";
import { stubClipboard } from "./helpers";

afterEach(cleanup);

/**
 * The one fragment that proves the right block is on screen for each target —
 * taken from the repo and the live deployment, not invented: the MCP entry
 * point is apps/mcp/src/index.ts and the env names are the ones apps/mcp reads.
 */
const MARKERS: Record<string, string> = {
  "claude-code": "claude mcp add --transport http",
  "mcp-json": '"type": "http"',
  "claude-desktop": "Add custom connector",
  "self-host": "git clone",
};

/** The only hosts allowed to appear: the repo, the live API, and the two faucets. */
// The deployment now lives under one domain, and localhost stays only because
// the snippets fall back to it when the env vars are absent, which is what a
// local `bun run dev` sees.
const ALLOWED_HOSTS = [
  "https://github.com/bajigurxyz/bajigur.git",
  "https://api.bajigur.xyz",
  "https://app.bajigur.xyz",
  "https://mcp.bajigur.xyz",
  "https://portal.hedera.com",
  "https://faucet.circle.com",
  "http://localhost:3000",
  "http://localhost:3004",
];

describe("target honesty", () => {
  it("covers every marker and keeps ids in sync", () => {
    expect(ONBOARDING_TARGETS.map((t) => t.id).sort()).toEqual(Object.keys(MARKERS).sort());
  });

  it("never presents an npm package as runnable — nothing here is published", () => {
    for (const target of ONBOARDING_TARGETS) {
      expect(target.snippet).not.toMatch(/npx bajigur|npm i(nstall)? -g bajigur/);
    }
  });

  it("points every setup at the live API, never at a local one", () => {
    for (const target of ONBOARDING_TARGETS) {
      const block = `${target.snippet}\n${target.note}`;
      if (!block.includes("BAJIGUR_API_URL")) continue;
      expect(block).toContain("https://api.bajigur.xyz");
      expect(block).not.toMatch(/BAJIGUR_API_URL[^\n]*localhost/);
    }
  });

  it("names a funding source wherever it asks for a key of the user's own", () => {
    for (const target of ONBOARDING_TARGETS) {
      if (!target.snippet.includes("HEDERA_OPERATOR_KEY")) continue;
      expect(target.snippet).toContain("https://portal.hedera.com");
      expect(target.snippet).toContain("https://faucet.circle.com");
    }
  });

  it("points at no invented host", () => {
    for (const target of ONBOARDING_TARGETS) {
      const hosts = `${target.snippet}\n${target.note}`.match(/https?:\/\/[^\s"'`]+/g) ?? [];
      for (const host of hosts) {
        expect(ALLOWED_HOSTS.some((allowed) => host.startsWith(allowed))).toBe(true);
      }
    }
  });
});

describe("tabs", () => {
  it("renders an accessible tablist and shows the one-command path first", () => {
    render(<AgentOnboarding />);
    const tablist = screen.getByRole("tablist", { name: "Choose your agent" });
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(ONBOARDING_TARGETS.length);

    // Roving tabindex: the selected tab is the only tab stop.
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[0].tabIndex).toBe(0);
    for (const tab of tabs.slice(1)) {
      expect(tab.getAttribute("aria-selected")).toBe("false");
      expect(tab.tabIndex).toBe(-1);
    }

    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(tabs[0].id);
    expect(tabs[0].getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.textContent).toContain(MARKERS["claude-code"]);
    expect(tablist).toBeTruthy();
  });

  it("shows the matching snippet for every target when clicked", () => {
    render(<AgentOnboarding />);
    for (const target of ONBOARDING_TARGETS) {
      fireEvent.click(screen.getByRole("tab", { name: target.label }));
      const panel = screen.getByRole("tabpanel");
      expect(panel.textContent).toContain(MARKERS[target.id]);
      // The full snippet is on screen, not a truncation of it.
      expect(panel.textContent).toContain(target.snippet);
    }
  });

  it("moves selection with arrow keys, Home, and End — selection follows focus", () => {
    render(<AgentOnboarding />);
    const tabs = screen.getAllByRole("tab");

    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[1]);
    expect(screen.getByRole("tabpanel").textContent).toContain(MARKERS[ONBOARDING_TARGETS[1].id]);

    fireEvent.keyDown(tabs[1], { key: "ArrowLeft" });
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[0]);

    // Arrows wrap at both ends.
    fireEvent.keyDown(tabs[0], { key: "ArrowLeft" });
    expect(tabs[tabs.length - 1].getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(tabs[tabs.length - 1], { key: "Home" });
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(tabs[0], { key: "End" });
    expect(tabs[tabs.length - 1].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[tabs.length - 1]);
  });
});

describe("copy button", () => {
  it("copies the ACTIVE tab's snippet and announces it via aria-live", async () => {
    const writeText = stubClipboard();
    render(<AgentOnboarding />);

    const lastTarget = ONBOARDING_TARGETS[ONBOARDING_TARGETS.length - 1]!;
    fireEvent.click(screen.getByRole("tab", { name: lastTarget.label }));
    fireEvent.click(
      screen.getByRole("button", {
        name: `Copy the ${lastTarget.label} setup block`,
      }),
    );

    expect(await screen.findByText("Copied!")).toBeTruthy();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(lastTarget.snippet);
    expect(screen.getByRole("status").textContent).toContain(
      `${lastTarget.label} setup block copied to clipboard`,
    );
  });

  it("names the failure and stays retryable when the clipboard refuses", async () => {
    const writeText = stubClipboard();
    writeText.mockRejectedValueOnce(new Error("denied"));
    render(<AgentOnboarding />);

    const button = screen.getByRole("button", {
      name: `Copy the ${ONBOARDING_TARGETS[0].label} setup block`,
    });
    fireEvent.click(button);
    expect(await screen.findByText("Copy failed, retry")).toBeTruthy();

    fireEvent.click(button);
    expect(await screen.findByText("Copied!")).toBeTruthy();
  });
});

describe("landing integration", () => {
  it("mounts the onboarding section and the why-buy sentence on the home page", () => {
    render(<Home />);
    expect(screen.getByRole("tablist", { name: "Choose your agent" })).toBeTruthy();
    expect(screen.getByText(/written against that exact prompt/i)).toBeTruthy();
  });
});
