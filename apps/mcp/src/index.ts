import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { agentWallet, paidFetch, wallet } from "./pay";
import { createServer } from "./server";

const api = process.env.BAJIGUR_API_URL ?? "http://localhost:3002";

const agentToken = process.env.BAJIGUR_AGENT_TOKEN;
const { paid, account } = agentToken
  ? await agentWallet(api, agentToken)
  : { paid: paidFetch(), account: wallet().accountId };

await createServer(api, paid, fetch, process.env.ENS_AGENT_NAME ?? account).connect(
  new StdioServerTransport(),
);
