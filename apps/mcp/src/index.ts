import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { paidFetch, wallet } from "./pay";
import { createServer } from "./server";

const api = process.env.BAJIGUR_API_URL ?? "http://localhost:3002";

await createServer(api, paidFetch(), fetch, wallet().accountId).connect(new StdioServerTransport());
