"use client";

import { useRef, useState } from "react";
import CopyButton from "@/components/CopyButton";

/**
 * Agent onboarding: the landing section where a visitor with an agent copies
 * ONE block and is wired into the marketplace.
 *
 * Every command here comes from the repo and the live deployment, not from
 * imagination: the MCP entry point is apps/mcp/src/index.ts, the env names are
 * the ones apps/mcp reads, and the API is the deployed one. The test suite
 * enforces that no other host appears.
 *
 * The first tab is the one that needs no key at all — a Privy wallet delegated
 * on the web app pays, and apps/api signs. That is the whole point of the
 * product, so it leads.
 *
 * Tabs follow the WAI-ARIA tabs pattern: roving tabindex, arrow-key navigation
 * with selection following focus, labelled panels. The copy control keeps its
 * named states and aria-live region.
 */

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const MCP_URL = `${(process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:3004").replace(/\/+$/, "")}/mcp`;

export type OnboardingTarget = {
  id: string;
  label: string;
  intro: string;
  snippet: string;
  note: string;
};

export const ONBOARDING_TARGETS: OnboardingTarget[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    intro: "One command. No clone, no install, no config file to find.",
    snippet: `# Browse the catalogue straight away:
claude mcp add --transport http bajigur ${MCP_URL}

# To buy, add the agent token from ${APP_URL}/connect:
claude mcp add --transport http bajigur ${MCP_URL} \\
  --header "Authorization: Bearer YOUR_AGENT_TOKEN"`,
    note: "Then ask: “search bajigur for a marquee prompt and buy it”. Without a token search still works and only buying is refused, so you can look before you commit.",
  },
  {
    id: "mcp-json",
    label: "Cursor · Windsurf · Cline",
    intro: "Any MCP client that takes a URL. Paste this into its MCP config.",
    snippet: `{
  "mcpServers": {
    "bajigur": {
      "type": "http",
      "url": "${MCP_URL}",
      "headers": {
        "Authorization": "Bearer YOUR_AGENT_TOKEN"
      }
    }
  }
}`,
    note: `Drop the headers block to browse without a wallet. Get the token at ${APP_URL}/connect. Config file names differ per editor, but most accept this shape.`,
  },
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    intro:
      "Custom connectors take a URL and nothing else, which is all this needs. Sign in when it asks and buying works too.",
    snippet: `# Settings -> Connectors -> Add custom connector
${MCP_URL}

# That is the whole setup. The first time your agent tries to buy, the
# server answers 401 and names its authorization server, so Desktop opens
# the browser and you sign in with the same email you use on Bajigur.
#
# Prefer to paste a token instead? Get one at ${APP_URL}/connect and use
# the mcp.json tab, which does take a header.`,
    note: "You still hold no private key: Bajigur signs each payment with the Privy wallet you delegated, never above the token's cap, and revoking the delegation kills the token.",
  },
];

export default function AgentOnboarding() {
  const [activeId, setActiveId] = useState(ONBOARDING_TARGETS[0].id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const active = ONBOARDING_TARGETS.find((t) => t.id === activeId) ?? ONBOARDING_TARGETS[0];

  // Selection follows focus (WAI-ARIA tabs, automatic activation).
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const count = ONBOARDING_TARGETS.length;
    const index = ONBOARDING_TARGETS.findIndex((t) => t.id === activeId);
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = (index + 1) % count;
        break;
      case "ArrowLeft":
        next = (index - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const target = ONBOARDING_TARGETS[next];
    setActiveId(target.id);
    tabRefs.current[target.id]?.focus();
  };

  return (
    <section
      id="for-agents"
      className="relative z-20 mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24"
    >
      <p className="mb-3 text-xs font-medium tracking-widest text-gray-500 uppercase">For agents</p>
      <h2 className="mb-4 text-3xl leading-tight font-normal tracking-tight sm:text-4xl md:text-5xl">
        Wire your agent in one paste
      </h2>
      <p className="mb-3 max-w-2xl text-base text-gray-600 sm:text-lg">
        Why buy instead of improvising? A listing carries a preview written against that exact
        prompt, so the buyer pays for proven output rather than text a model could invent.
      </p>
      <p className="mb-8 max-w-2xl text-sm text-gray-500">
        Every setup below talks to the live API on Hedera testnet. Prompts are priced in USDC or
        HBAR and paid straight to their creator; the facilitator covers the Hedera fee, so your
        wallet never needs gas.
      </p>

      <div
        role="tablist"
        aria-label="Choose your agent"
        onKeyDown={onKeyDown}
        className="mb-6 flex flex-wrap gap-2"
      >
        {ONBOARDING_TARGETS.map((target) => {
          const selected = target.id === activeId;
          return (
            <button
              key={target.id}
              ref={(el) => {
                tabRefs.current[target.id] = el;
              }}
              type="button"
              role="tab"
              id={`agent-tab-${target.id}`}
              aria-selected={selected}
              aria-controls={`agent-panel-${target.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(target.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none ${
                selected
                  ? "border-black bg-black text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-500 hover:text-black"
              }`}
            >
              {target.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`agent-panel-${active.id}`}
        aria-labelledby={`agent-tab-${active.id}`}
      >
        <p className="mb-4 max-w-2xl text-sm text-gray-600">{active.intro}</p>

        <div className="overflow-hidden rounded-2xl bg-gray-950">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5">
            <span className="truncate text-xs text-gray-400">{active.label}</span>
            <CopyButton text={active.snippet} label={active.label} />
          </div>
          <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-gray-100">
            <code>{active.snippet}</code>
          </pre>
        </div>

        <p className="mt-3 max-w-2xl text-xs text-gray-500">{active.note}</p>

        <a
          href="/mcp"
          className="mt-4 inline-block text-sm text-gray-700 underline underline-offset-4 transition-colors hover:text-black"
        >
          Full MCP documentation
        </a>
      </div>
    </section>
  );
}
