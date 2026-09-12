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
      post: {
        operationId: "publishPrompt",
        summary:
          "Publish a prompt. Bearer agent token; payTo and creator come from the token, never the body.",
        security: [{ agentToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  preview: { type: "string" },
                  body: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  priceUsd: { type: "string", description: 'Decimal string, e.g. "0.20"' },
                  priceHbar: { type: "string", description: 'Decimal string, e.g. "2"' },
                  rating: {
                    type: "object",
                    description:
                      "What buyers said about this prompt's creator, from the ERC-8004 ReputationRegistry on Hedera. Absent until someone has rated them.",
                    properties: {
                      count: { type: "integer" },
                      score: { type: "integer", description: "Net of likes and dislikes" },
                      agent: { type: "string", description: "CAIP-style ERC-8004 agent reference" },
                    },
                  },
                  previewMedia: {
                    type: "string",
                    description:
                      "https URL on an allowed host, ending .webp .gif .png .jpg .mp4 or .webm",
                  },
                },
                required: ["title", "preview", "body", "priceUsd", "priceHbar"],
              },
            },
          },
        },
        responses: {
          "201": { description: "Published, and registered on PromptRegistry" },
          "400": { description: "Invalid field" },
          "401": { description: "Missing or invalid agent token" },
          "429": { description: "Too many prompts published" },
        },
      },
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
    "/prompts/{id}/buyers": {
      get: {
        operationId: "listBuyers",
        summary: "Who holds a licence for this prompt. Creator only (agent token matching payTo).",
        security: [{ agentToken: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Buyers, newest last" },
          "401": { description: "Missing or invalid agent token" },
          "403": { description: "Not the creator" },
        },
      },
    },
    "/ens/available": {
      get: {
        operationId: "nameAvailable",
        summary: "Whether a label can still be claimed under the parent name. Free.",
        parameters: [{ name: "label", in: "query", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "{ available }" },
          "400": { description: "Invalid label" },
        },
      },
    },
    "/ens/claim": {
      post: {
        operationId: "claimName",
        summary:
          "Claim <label>.<parent> for the token's wallet. Bajigur pays the Sepolia gas and writes the wallet's Hedera account into bajigur.hedera.",
        security: [{ agentToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { label: { type: "string" } },
                required: ["label"],
              },
            },
          },
        },
        responses: {
          "200": { description: "{ name, hedera, transaction }" },
          "401": { description: "Missing or invalid agent token" },
          "409": { description: "Label taken, or this wallet already owns a name" },
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
        summary:
          "Prompts a Hedera account (0.0.x) or ENS name (bajigur.hedera record) holds an onchain licence for. Free.",
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
    securitySchemes: {
      agentToken: { type: "http", scheme: "bearer", description: "Bajigur agent token" },
    },
    schemas: {
      Listing: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          preview: { type: "string" },
          previewMedia: {
            type: "string",
            format: "uri",
            description: "Animated preview (webp/mp4) of the result, when available",
          },
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
    ...(process.env.ENS_NAME
      ? [{ name: "ENS", endpoint: `agent.${process.env.ENS_NAME}`, version: "v1" }]
      : []),
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
