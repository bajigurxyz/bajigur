import { service } from "./x402";

export const openapi = (origin: string) => ({
  openapi: "3.0.3",
  info: {
    title: "Bajigur",
    version: "0.1.0",
    description:
      "Pay-per-use marketplace of motion/web design prompts. Catalogue and discovery are free; unlocking a prompt is gated by x402 v2 on Hedera (USDC or HBAR) unless the caller's wallet already holds a licence.",
  },
  servers: [{ url: origin }],
  paths: {
    "/prompts": {
      get: {
        operationId: "listPrompts",
        summary: "List prompts (id, title, tags, preview, prices). Free.",
        responses: {
          "200": {
            description: "Catalogue",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Listing" } },
              },
            },
          },
        },
      },
    },
    "/prompts/{id}": {
      get: {
        operationId: "getPromptListing",
        summary: "Listing for one prompt without its body. Free.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Listing",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Listing" } } },
          },
          "404": { description: "Unknown prompt" },
        },
      },
    },
    "/prompts/{id}/unlock": {
      get: {
        operationId: "unlockPrompt",
        summary:
          "Full prompt body. Answers 402 (x402 v2, hedera:testnet, USDC or HBAR) unless the wallet holds a licence.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Prompt body",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { id: { type: "string" }, body: { type: "string" } },
                  required: ["id", "body"],
                },
              },
            },
          },
          "402": { description: "Payment required; see the PAYMENT-REQUIRED header (x402 v2)" },
          "404": { description: "Unknown prompt" },
        },
      },
    },
    "/discovery/resources": {
      get: {
        operationId: "discoverResources",
        summary: "x402 bazaar-style directory of paid resources. Free.",
        responses: { "200": { description: "Directory" } },
      },
    },
    "/licenses/{account}": {
      get: {
        operationId: "listLicenses",
        summary: "Prompts a Hedera account holds an onchain licence for. Free.",
        parameters: [
          {
            name: "account",
            in: "path",
            required: true,
            schema: { type: "string", example: "0.0.8291460" },
          },
        ],
        responses: {
          "200": {
            description: "Listings",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Listing" } },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Listing: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          preview: { type: "string" },
          priceUsd: { type: "string", example: "0.10" },
          priceHbar: { type: "string", example: "1" },
          payTo: {
            type: "string",
            description: "Creator's Hedera account",
            example: "0.0.7275085",
          },
          registryId: { type: "integer", description: "Token id in PromptRegistry" },
        },
        required: ["id", "title", "tags", "preview", "priceUsd", "priceHbar", "payTo"],
      },
    },
  },
});

// ERC-8004 registration file; `registrations` is filled once the agent is registered onchain.
export const agentCard = (origin: string) => ({
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: service.serviceName,
  description:
    "Pay-per-use marketplace of motion/web design prompts for AI agents. Discover for free, pay per prompt over x402 on Hedera, keep an onchain licence.",
  services: [
    { name: "web", endpoint: `${origin}/` },
    { name: "openapi", endpoint: `${origin}/openapi.json`, version: "3.0.3" },
    { name: "x402-discovery", endpoint: `${origin}/discovery/resources`, version: "2" },
  ],
  x402Support: true,
  active: true,
  registrations: process.env.ERC8004_AGENT_ID
    ? [
        {
          agentId: Number(process.env.ERC8004_AGENT_ID),
          agentRegistry: "eip155:296:0x8004A818BFB912233c491871b3d84c89A494BD9e",
        },
      ]
    : [],
  supportedTrust: ["reputation"],
});
