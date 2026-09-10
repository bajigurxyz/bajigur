# @bajigur/mcp

MCP server that lets Claude Desktop (or any MCP client) search the Bajigur
prompt catalogue and buy a prompt over x402 on Hedera.

Tools:

- `search_prompts` — free; returns id, title, tags, preview and USD price.
- `get_prompt` — free if the wallet already holds a licence; otherwise pays
  the listed price (USDC or HBAR) through the Blocky402 facilitator, receives
  an ERC-1155 licence from `PromptRegistry`, and returns the full prompt plus
  the Hedera transaction id.
- `my_licenses` — prompts this wallet holds a licence for.

## Run

Needs a funded Hedera testnet account that is associated with USDC
(`bun run hedera:associate` from the repo root) and the API running
(`bun run dev --filter=@bajigur/api`).

Add to Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "bajigur": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/bajigur/apps/mcp/src/index.ts"],
      "env": {
        "BAJIGUR_API_URL": "http://localhost:3002",
        "HEDERA_NETWORK": "testnet",
        "HEDERA_OPERATOR_ID": "0.0.xxxxxxx",
        "HEDERA_OPERATOR_KEY": "<hex ecdsa private key>",
        "X402_MAX_SPEND_USD": "1",
        "X402_PAY_WITH": "usdc"
      }
    }
  }
}
```

Pay with a Privy server wallet instead of a raw key: set `NEXT_PUBLIC_PRIVY_APP_ID`,
`PRIVY_APP_SECRET` and `PRIVY_WALLET_ID`, send the wallet some HBAR, then run
`bun run privy:associate` once and `bun run privy:spike <prompt-id>`.

Buy from the terminal instead (reads the root `.env`):

```bash
bun run buy marquee-logos
X402_PAY_WITH=hbar bun run buy marquee-logos
```

The Claude Agent Skills in `../../skills/` sit on top of this server. Bazantic
Gateway and Recipes point at the same API, not at this server.

Owner: Kiel.
