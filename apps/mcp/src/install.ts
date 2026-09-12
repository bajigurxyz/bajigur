const APP_URL = process.env.BAJIGUR_APP_URL ?? "http://localhost:3000";

/**
 * The plain-text guide served for any path that is not /mcp.
 *
 * A human who pastes the connector URL into a browser should land on
 * instructions, not a 404 — and the same text doubles as the copy-paste block
 * the landing page links to.
 *
 * `origin` is the URL this server is actually reachable at, so the snippets
 * are correct whether it is running on localhost or a public domain.
 */
export function install(origin: string) {
  const url = `${origin}/mcp`;
  return `Bajigur — MCP server
====================

A marketplace of motion and web design prompts your agent can search, pay for,
and use on its own. Payment is x402 on Hedera, settled straight to the prompt's
creator. One purchase mints an onchain licence, so the same wallet re-reads
that prompt for free from any client, forever.

Endpoint:  ${url}
Transport: Streamable HTTP
Auth:      Authorization: Bearer <your agent token>   (optional — see below)


1. CONNECT WITHOUT A WALLET (browse only)
-----------------------------------------
You can connect with no credential at all and search the catalogue. Buying is
refused until you add a token.

  Claude Code:
    claude mcp add --transport http bajigur ${url}

  Claude Desktop:
    Settings -> Connectors -> Add custom connector -> paste:
    ${url}

  Cursor / Windsurf / Cline / any mcp.json:
    {
      "mcpServers": {
        "bajigur": {
          "type": "http",
          "url": "${url}"
        }
      }
    }


2. CONNECT WITH A WALLET (buy prompts)
--------------------------------------
Get a token first: sign in at ${APP_URL}/connect, delegate your wallet, and
copy the agent token it shows you. You never hold a private key — Bajigur signs
each payment with your delegated Privy wallet, never above the token's cap, and
revoking the delegation in Privy kills the token with it.

  Claude Code:
    claude mcp add --transport http bajigur ${url} \\
      --header "Authorization: Bearer YOUR_AGENT_TOKEN"

  Cursor / Windsurf / Cline / any mcp.json:
    {
      "mcpServers": {
        "bajigur": {
          "type": "http",
          "url": "${url}",
          "headers": {
            "Authorization": "Bearer YOUR_AGENT_TOKEN"
          }
        }
      }
    }

  Claude Desktop: custom connectors do not take a custom header today. Use the
  stdio server instead — see section 4.


3. TOOLS
--------
  search_prompts   Free. Search the catalogue; returns id, title, tags, a
                   preview and the price.
  get_prompt       Returns the full prompt text. Free if your wallet already
                   holds the licence; otherwise pays the listed price on Hedera
                   and returns the transaction id with the prompt.
  my_licenses      What your wallet already owns.

Try: "search bajigur for a marquee prompt, then buy it"


4. RUN IT YOURSELF (stdio, or with your own Hedera key)
-------------------------------------------------------
  git clone https://github.com/bajigurxyz/bajigur.git && cd bajigur
  bun install

  claude_desktop_config.json:
    {
      "mcpServers": {
        "bajigur": {
          "command": "bun",
          "args": ["$(pwd)/apps/mcp/src/index.ts"],
          "env": {
            "BAJIGUR_API_URL": "https://api-production-fe21.up.railway.app",
            "BAJIGUR_AGENT_TOKEN": "YOUR_AGENT_TOKEN"
          }
        }
      }
    }

  To pay from your own Hedera account instead of a delegated wallet, drop
  BAJIGUR_AGENT_TOKEN and set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY. Get a
  testnet account at https://portal.hedera.com and testnet USDC at
  https://faucet.circle.com, then run \`bun run hedera:associate\` once. No HBAR
  for gas is needed — the facilitator pays the Hedera fee.
`;
}
