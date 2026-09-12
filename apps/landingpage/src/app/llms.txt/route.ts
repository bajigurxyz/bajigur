const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const MCP_ORIGIN = (process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:3004").replace(/\/+$/, "");
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://api.bajigur.xyz").replace(/\/+$/, "");

/**
 * `/llms.txt`, the convention for handing a model the short version of a site.
 *
 * It exists because an agent asked to "set up Bajigur" reads whatever it finds
 * and follows it literally. Left to a README it finds the repository, and the
 * repository begins with `git clone`, which is the one path nobody should take.
 * So the answer has to be stated first, in plain text, with the alternative
 * marked as optional further down.
 *
 * Plain text on purpose: no markup to misparse, and cheap to read in full.
 */
const body = () => `# Bajigur

> A marketplace of motion and web design prompts an AI agent can search, buy and
> use on its own. Payment is x402 on Hedera, settled straight to the prompt's
> creator. One purchase mints an ERC-1155 licence to the buyer's wallet, so the
> same prompt is re-read for free from any client, forever.

## Connecting an agent

There is nothing to clone and nothing to install. The server is hosted. Use the
URL.

  Claude Code:
    claude mcp add --transport http bajigur ${MCP_ORIGIN}/mcp

  Claude Desktop:
    Settings -> Connectors -> Add custom connector -> ${MCP_ORIGIN}/mcp

  Cursor, Windsurf, Cline, any mcp.json:
    {"mcpServers":{"bajigur":{"type":"http","url":"${MCP_ORIGIN}/mcp"}}}

Do not clone the repository to use Bajigur. There is no step that needs it, and
an agent that starts there has taken a wrong turn.

## Signing in

Connect with no credential and the catalogue works; only buying is refused.

The first time an agent calls a paid tool without a wallet, the server answers
401 and names its authorization server (RFC 9728), which is the signal a client
needs to start OAuth and open a browser. Clients that cannot do that can carry a
token instead: sign in at ${APP_URL}/connect and send it as
\`Authorization: Bearer <token>\`.

The user never holds a private key. Privy creates a wallet, Bajigur signs each
payment for it under a per-payment cap, and revoking the delegation in Privy
ends it.

## Tools

  search_prompts   Free. Search the catalogue. Returns id, title, tags, a text
                   preview, an animated preview URL when the creator supplied
                   one, and the price in USDC and in HBAR.
  get_prompt       Returns the full prompt text. Free when the wallet already
                   holds the licence. Otherwise it pays the listed price over
                   x402, receives the licence, and returns the Hedera
                   transaction id with the text.
  my_licenses      What this wallet already owns.

## Paying

Every prompt is quoted in both USDC and HBAR, and the agent pays in whichever
the wallet holds. The Hedera network fee is covered by the facilitator, so the
wallet never needs gas. Payment goes to the creator's own Hedera account,
resolved at payment time from their name under bajigur.eth.

## Publishing

Claim a name under bajigur.eth, publish a prompt priced in each asset, and every
purchase pays that account directly. Start at ${APP_URL}/welcome.

## Endpoints

  MCP server     ${MCP_ORIGIN}/mcp
  Install guide  ${MCP_ORIGIN}
  Documentation  https://bajigur.xyz/mcp
  Web app        ${APP_URL}
  API            ${API_URL}
  OpenAPI        ${API_URL}/openapi.json
  Catalogue      ${API_URL}/prompts
  Agent card     ${API_URL}/.well-known/agent.json

## Network

Hedera testnet. x402 v2, settled through the Blocky402 facilitator. Licences are
ERC-1155. Names are ENSv2 subnames on Sepolia, registered and paid for by
Bajigur so the user stays on Hedera.
`;

export async function GET() {
  return new Response(body(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
