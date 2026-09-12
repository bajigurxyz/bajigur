<div align="center">

# Bajigur

### A marketplace your AI can shop at. It finds the prompt, pays for it on-chain, and uses it, without asking you for a card.

**Pay-per-use design prompts, settled with [x402 v2](https://x402.org) on [Hedera](https://hedera.com).**
Buy one prompt for a few cents instead of a monthly plan. A purchase mints an ERC-1155 licence to
your wallet, so the same prompt is free to read again from any client, forever.

<br/>

[![Network](https://img.shields.io/badge/Hedera-testnet-1f6feb?style=for-the-badge)](https://hashscan.io/testnet)
[![Contracts](https://img.shields.io/badge/contracts-verified-2ea043?style=for-the-badge)](https://hashscan.io/testnet/contract/0x59de4C018968E0357EeF77042dD2Fc2ff33e1418)
[![MCP](https://img.shields.io/badge/MCP-live-8957e5?style=for-the-badge)](https://bajigur.xyz/mcp)
[![Tracks](https://img.shields.io/badge/ETHOnline_2026-Hedera_·_Privy_·_ENS-f0883e?style=for-the-badge)](https://ethglobal.com/events/ethonline2026)

**[Live App](https://app.bajigur.xyz)** · **[MCP Server](https://bajigur.xyz/mcp)** ·
**[API](https://api.bajigur.xyz/prompts)** · **[Site](https://bajigur.xyz)**

</div>

---

## Why we built it

An AI agent can write your landing page, but it cannot buy the one asset that would make it good.
Every marketplace assumes a human with a card and a subscription, so the agent either takes something
it has no right to, or stops and asks you. Meanwhile the person who made that asset gets nothing,
because selling a single prompt for twenty cents means first building a payments company.

Bajigur is the counter where those two can finally meet.

---

## How it works, in one line each

| | |
|---|---|
| **Payment is the protocol** | An unpaid request gets a real HTTP `402` with the creator's Hedera account inside it. The agent pays and retries. No checkout, no API key, no invoice. |
| **The name is the payout address** | A creator's payout account is the `bajigur.hedera` text record on their ENSv2 name, read live when we quote a price. We never hold it, so we cannot hold it hostage. |
| **The licence is the access control** | Settlement mints an ERC-1155 to the buyer. That token grants access, so our records can never disagree with who can open a prompt. |
| **The rating belongs to the buyer** | Only a licence holder can rate a creator, and the rating is written to ERC-8004 on Hedera, signed and paid by that buyer's own wallet. |

---

## Try it in two minutes

Paste this into Claude Desktop, Claude Code or Cursor, then ask it to find a cinematic landing page
prompt on Bajigur:

```
https://mcp.bajigur.xyz/mcp
```

Nothing to clone, nothing to install, and no private key on the machine. Or see the payment challenge
raw, with the creator's Hedera account inside it:

```bash
curl -sD- -o/dev/null https://api.bajigur.xyz/prompts/nova-ai-cinematic-landing/unlock \
  | grep -i payment-required | cut -d' ' -f2 | base64 -d | jq '.accepts'
```

Prefer to be a person about it? [app.bajigur.xyz](https://app.bajigur.xyz) signs you in with an
email, makes the wallet, claims your name, and buys with a button.

---

## Repositories

| Repo | What's inside |
|---|---|
| **[bajigur](https://github.com/bajigurxyz/bajigur)** | Everything. The x402 API, the MCP server, both Next.js apps, and the Foundry contracts, in one Bun monorepo. Start with the [README](https://github.com/bajigurxyz/bajigur#readme). |

---

## Built on

**[Hedera](https://hedera.com)** for settlement, HTS for the assets, HCS for the audit trail ·
**[Privy](https://privy.io)** for wallets that pay without a popup ·
**[ENS](https://ens.domains)** for names that are also payout addresses ·
**[ERC-8004](https://8004scan.io)** for reputation the creator cannot write ·
**[x402](https://x402.org)** and the **Blocky402** facilitator for the payment protocol itself

---

<div align="center">
<br/>

**Built for [ETHGlobal ETHOnline 2026](https://ethglobal.com/events/ethonline2026)**

[Live App](https://app.bajigur.xyz) · [MCP Server](https://bajigur.xyz/mcp) · [API](https://api.bajigur.xyz/prompts)

<sub>Hedera testnet and Sepolia. Real contracts, real transactions, testnet money.</sub>

</div>
