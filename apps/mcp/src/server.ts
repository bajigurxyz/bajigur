import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { decodePaymentResponseHeader } from "@x402/fetch";
import { z } from "zod";

type Fetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

type Listing = {
  id: string;
  title: string;
  tags: string[];
  preview: string;
  priceUsd: string;
};

const text = (value: string) => ({ content: [{ type: "text" as const, text: value }] });
const fail = (value: string) => ({ isError: true, ...text(value) });

export function createServer(api: string, paid: Fetch, plain: Fetch = fetch) {
  const server = new McpServer({ name: "bajigur", version: "0.1.0" });

  server.registerTool(
    "search_prompts",
    {
      description:
        "Search the Bajigur catalogue of motion/web design prompts. Free. Returns id, title, tags, a preview and the price in USD. Call get_prompt with an id to buy the full text.",
      inputSchema: {
        query: z.string().optional().describe("Keywords to match against title, tags and preview"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query }) => {
      const res = await plain(`${api}/prompts`);
      if (!res.ok) return fail(`catalogue unavailable: ${res.status}`);
      const all = (await res.json()) as Listing[];
      const q = query?.trim().toLowerCase();
      const hits = q
        ? all.filter((p) =>
            [p.id, p.title, p.preview, ...p.tags].join(" ").toLowerCase().includes(q),
          )
        : all;
      return text(JSON.stringify(hits, null, 2));
    },
  );

  server.registerTool(
    "get_prompt",
    {
      description:
        "Buy and return the full text of a prompt by id. Pays the listed USD price in USDC on Hedera through x402 from the configured wallet, then returns the prompt body and the Hedera transaction id.",
      inputSchema: { id: z.string().describe("Prompt id from search_prompts") },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ id }) => {
      let res: Response;
      try {
        res = await paid(`${api}/prompts/${id}/unlock`);
      } catch (err) {
        return fail(`payment failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (!res.ok) return fail(`${res.status}: ${await res.text()}`);
      const { body } = (await res.json()) as { body: string };
      const header = res.headers.get("PAYMENT-RESPONSE");
      const settlement = header ? decodePaymentResponseHeader(header) : undefined;
      const receipt = settlement?.transaction
        ? `\n\nPaid. Hedera transaction ${settlement.transaction}`
        : "";
      return text(`${body}${receipt}`);
    },
  );

  return server;
}
