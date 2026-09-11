import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { agentWallet, paidFetch } from "../src/pay";
import { createServer } from "../src/server";

const id = process.argv[2];
if (!id) {
  console.error("usage: X402_PAY_WITH=hbar|usdc bun scripts/buy.ts <prompt-id>");
  process.exit(1);
}

const api = process.env.BAJIGUR_API_URL ?? "http://localhost:3002";
const token = process.env.BAJIGUR_AGENT_TOKEN;
const paid = token ? (await agentWallet(api, token)).paid : paidFetch();
const [a, b] = InMemoryTransport.createLinkedPair();
await createServer(api, paid).connect(a);
const client = new Client({ name: "bajigur-cli", version: "0" });
await client.connect(b);

const result = await client.callTool({ name: "get_prompt", arguments: { id } });
console.log((result.content as { text: string }[])[0]?.text);
process.exit(result.isError ? 1 : 0);
