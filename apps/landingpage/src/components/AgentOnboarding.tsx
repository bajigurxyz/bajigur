"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

const REPO = "https://github.com/bajigurxyz/bajigur.git";
const API = "https://api-production-fe21.up.railway.app";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export type OnboardingTarget = {
  id: string;
  label: string;
  intro: string;
  snippet: string;
  note: string;
};

export const ONBOARDING_TARGETS: OnboardingTarget[] = [
  {
    id: "claude-delegated",
    label: "Claude Desktop · no key",
    intro:
      "The recommended path. Sign in on the web app, delegate your wallet, and paste the token it gives you — you never hold a private key.",
    snippet: `# 1. Clone, so Claude can run the MCP server from your checkout
git clone ${REPO} && cd bajigur
bun install

# 2. Sign in at ${APP_URL}/connect, delegate your wallet,
#    and copy the agent token it shows you.

# 3. claude_desktop_config.json — no Hedera key anywhere:
{
  "mcpServers": {
    "bajigur": {
      "command": "bun",
      "args": ["$(pwd)/apps/mcp/src/index.ts"],
      "env": {
        "BAJIGUR_API_URL": "${API}",
        "BAJIGUR_AGENT_TOKEN": "<paste the token from the web app>"
      }
    }
  }
}`,
    note: "Bajigur signs each payment with your delegated Privy wallet, never above the cap the token carries. Revoke the delegation in Privy and the token dies with it.",
  },
  {
    id: "claude-key",
    label: "Claude Desktop · own wallet",
    intro:
      "Already have a Hedera testnet account? Pay from it directly and skip the web app entirely.",
    snippet: `git clone ${REPO} && cd bajigur
bun install

# An ECDSA testnet account from https://portal.hedera.com, holding
# testnet USDC from https://faucet.circle.com. No HBAR for gas needed —
# the facilitator pays the Hedera fee.
bun run hedera:associate

# claude_desktop_config.json
{
  "mcpServers": {
    "bajigur": {
      "command": "bun",
      "args": ["$(pwd)/apps/mcp/src/index.ts"],
      "env": {
        "BAJIGUR_API_URL": "${API}",
        "HEDERA_NETWORK": "testnet",
        "HEDERA_OPERATOR_ID": "0.0.xxxxxxx",
        "HEDERA_OPERATOR_KEY": "<hex ecdsa private key>",
        "X402_PAY_WITH": "usdc",
        "X402_MAX_SPEND_USD": "1"
      }
    }
  }
}`,
    note: "X402_PAY_WITH=hbar buys with HBAR instead; every prompt is priced in both.",
  },
  {
    id: "mcp-json",
    label: "Cursor · Windsurf · Cline",
    intro: "Any MCP-speaking agent takes the same stdio server. Paste this into its MCP config.",
    snippet: `{
  "mcpServers": {
    "bajigur": {
      "command": "bun",
      "args": ["/absolute/path/to/bajigur/apps/mcp/src/index.ts"],
      "env": {
        "BAJIGUR_API_URL": "${API}",
        "BAJIGUR_AGENT_TOKEN": "<token from the web app>"
      }
    }
  }
}`,
    note: "Clone the repo and run bun install first, then point args at your checkout. Config file names differ per editor — most accept this mcpServers shape.",
  },
  {
    id: "cli",
    label: "Terminal",
    intro: "No agent at all: buy a prompt straight from the command line.",
    snippet: `git clone ${REPO} && cd bajigur
bun install

# HEDERA_OPERATOR_ID / HEDERA_OPERATOR_KEY: an ECDSA testnet account from
# https://portal.hedera.com, funded with testnet USDC from
# https://faucet.circle.com. No HBAR for gas — the facilitator pays the fee.
cp .env.example .env

bun run hedera:associate
bun run buy marquee-logos
X402_PAY_WITH=hbar bun run buy hero-scroll-reveal`,
    note: "Reads the repo's root .env. Not published to npm — today the checkout is the install.",
  },
];

type CopyState = "idle" | "copied" | "error";

const RESET_MS = 2500;

function CopySnippetButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const settle = (next: CopyState) => {
    setState(next);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setState("idle"), RESET_MS);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      settle("copied");
    } catch {
      settle("error");
    }
  };

  const caption =
    state === "copied" ? "Copied!" : state === "error" ? "Copy failed — retry" : "Copy";

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy the ${label} setup block`}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 focus-visible:outline-none"
      >
        {state === "copied" ? (
          <Check aria-hidden className="h-3.5 w-3.5" />
        ) : (
          <Copy aria-hidden className="h-3.5 w-3.5" />
        )}
        {caption}
      </button>
      {/* Announced to assistive tech; visually the button text already changed. */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" && `${label} setup block copied to clipboard`}
        {state === "error" && `Copying the ${label} setup block failed`}
      </span>
    </>
  );
}

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
        prompt — the buyer pays for proven output, not for text a model could invent in a second.
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
            <CopySnippetButton text={active.snippet} label={active.label} />
          </div>
          <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-gray-100">
            <code>{active.snippet}</code>
          </pre>
        </div>

        <p className="mt-3 max-w-2xl text-xs text-gray-500">{active.note}</p>
      </div>
    </section>
  );
}
