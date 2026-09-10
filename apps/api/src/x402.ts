import {
  type FacilitatorClient,
  HTTPFacilitatorClient,
  x402ResourceServer,
} from "@x402/core/server";
import { bazaarResourceServerExtension, declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { ExactHederaScheme } from "@x402/hedera/exact/server";
import { paymentMiddleware } from "@x402/hono";
import type { OnSettled } from "./hcs";
import { findPrompt, type Prompt, payToOf, tinybars } from "./prompts";

const network = `hedera:${process.env.HEDERA_NETWORK ?? "testnet"}` as `hedera:${string}`;
const facilitatorUrl = process.env.X402_FACILITATOR_URL ?? "https://api.testnet.blocky402.com";

const promptFromPath = (path: string) => findPrompt(path.split("/")[2] ?? "");
function required(path: string) {
  const prompt = promptFromPath(path);
  if (!prompt) throw new Error(`unknown prompt in ${path}`);
  return prompt;
}
const scheme = new ExactHederaScheme();

export const service = { serviceName: "Bajigur", tags: ["design", "motion", "prompts"] };

const HBAR = "0.0.0";
const hbarPrice = (prompt: Prompt) => ({ asset: HBAR, amount: tinybars(prompt.priceHbar) });

export async function requirementsFor(prompt: Prompt) {
  const prices = [`$${prompt.priceUsd}`, hbarPrice(prompt)];
  return Promise.all(
    prices.map(async (price) => {
      const { asset, amount } = await scheme.parsePrice(price, network);
      return {
        scheme: "exact",
        network,
        asset,
        amount,
        payTo: payToOf(prompt),
        maxTimeoutSeconds: 300,
      };
    }),
  );
}

export function x402(
  facilitator: FacilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl }),
  onSettled?: OnSettled,
) {
  const server = new x402ResourceServer(facilitator)
    .register("hedera:*", scheme)
    .registerExtension(bazaarResourceServerExtension);
  if (onSettled) {
    server.onAfterSettle(async ({ paymentPayload, requirements, result }) => {
      if (!result.success) return;
      const url = paymentPayload.resource?.url;
      const promptId = url ? (new URL(url).pathname.split("/")[2] ?? "") : "";
      // ponytail: fire and forget so the paid response never waits on HCS; log if it fails
      onSettled({
        promptId,
        payer: result.payer ?? "",
        payTo: requirements.payTo,
        asset: requirements.asset,
        amount: requirements.amount,
        network: requirements.network,
        transaction: result.transaction,
        at: new Date().toISOString(),
      }).catch((err) => console.error("hcs audit failed", err));
    });
  }
  return paymentMiddleware(
    {
      "GET /prompts/:id/unlock": {
        accepts: [
          {
            scheme: "exact",
            network,
            price: ({ path }) => `$${promptFromPath(path)?.priceUsd ?? "0"}`,
            payTo: ({ path }) => payToOf(required(path)),
          },
          {
            scheme: "exact",
            network,
            price: ({ path }) => hbarPrice(required(path)),
            payTo: ({ path }) => payToOf(required(path)),
          },
        ],
        description: "Full prompt body from the Bajigur design prompt marketplace",
        mimeType: "application/json",
        ...service,
        extensions: declareDiscoveryExtension({
          pathParams: { id: "hero-scroll-reveal" },
          pathParamsSchema: {
            type: "object",
            properties: { id: { type: "string", description: "Prompt id from GET /prompts" } },
            required: ["id"],
          },
          output: { example: { id: "hero-scroll-reveal", body: "Build a pinned hero section..." } },
        }),
      },
    },
    server,
  );
}
