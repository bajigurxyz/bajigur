import { describe, expect, it } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server";

const listing = [
  {
    id: "hero-scroll-reveal",
    title: "Hero scroll reveal",
    tags: ["hero", "gsap"],
    preview: "Pinned hero",
    priceUsd: "0.10",
  },
  {
    id: "marquee-logos",
    title: "Infinite logo marquee",
    tags: ["marquee", "css"],
    preview: "Logo strip",
    priceUsd: "0.02",
  },
];
const settlement = Buffer.from(
  JSON.stringify({ success: true, transaction: "0.0.1@1.0", network: "hedera:testnet" }),
).toString("base64");

const plain = async () => Response.json(listing);
const paid = async (input: string | URL) =>
  String(input).endsWith("/prompts/hero-scroll-reveal/unlock")
    ? Response.json(
        { id: "hero-scroll-reveal", body: "Build a pinned hero." },
        { headers: { "PAYMENT-RESPONSE": settlement } },
      )
    : new Response("not found", { status: 404 });

async function connect() {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer("http://api", paid, plain).connect(a);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(b);
  return client;
}

const firstText = (result: Awaited<ReturnType<Client["callTool"]>>) =>
  (result.content as { type: string; text: string }[])[0]?.text ?? "";

describe("bajigur mcp", () => {
  it("exposes search_prompts and get_prompt", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["get_prompt", "search_prompts"]);
  });

  it("filters the catalogue by query", async () => {
    const client = await connect();
    const result = await client.callTool({
      name: "search_prompts",
      arguments: { query: "marquee" },
    });
    expect(JSON.parse(firstText(result))).toEqual([listing[1]]);
  });

  it("returns the body and the settlement transaction after paying", async () => {
    const client = await connect();
    const result = await client.callTool({
      name: "get_prompt",
      arguments: { id: "hero-scroll-reveal" },
    });
    expect(result.isError).toBeFalsy();
    expect(firstText(result)).toBe("Build a pinned hero.\n\nPaid. Hedera transaction 0.0.1@1.0");
  });

  it("reports an unknown prompt as an error", async () => {
    const client = await connect();
    const result = await client.callTool({ name: "get_prompt", arguments: { id: "nope" } });
    expect(result.isError).toBe(true);
    expect(firstText(result)).toBe("404: not found");
  });
});
