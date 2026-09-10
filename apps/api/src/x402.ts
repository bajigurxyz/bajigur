import {
  type FacilitatorClient,
  HTTPFacilitatorClient,
  type RoutesConfig,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@x402/core/server";
import { bazaarResourceServerExtension, declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { ExactHederaScheme } from "@x402/hedera/exact/server";
import { paymentMiddlewareFromHTTPServer } from "@x402/hono";
import type { OnSettled } from "./hcs";
import { findPrompt, type Prompt, payToOf, tinybars } from "./prompts";
import type { Identity, Registry } from "./registry";

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

export type X402Options = {
  facilitator?: FacilitatorClient;
  onSettled?: OnSettled;
  registry?: Registry;
  identity?: Identity;
};

export function x402({ facilitator, onSettled, registry, identity }: X402Options) {
  const server = new x402ResourceServer(
    facilitator ?? new HTTPFacilitatorClient({ url: facilitatorUrl }),
  )
    .register("hedera:*", scheme)
    .registerExtension(bazaarResourceServerExtension);

  server.onAfterSettle(async ({ paymentPayload, requirements, result }) => {
    if (!result.success) return;
    const url = paymentPayload.resource?.url;
    const prompt = url ? promptFromPath(new URL(url).pathname) : undefined;
    const payer = result.payer ?? "";
    // ponytail: fire and forget so the paid response never waits on chain writes; log if they fail
    onSettled?.({
      promptId: prompt?.id ?? "",
      payer,
      payTo: requirements.payTo,
      asset: requirements.asset,
      amount: requirements.amount,
      network: requirements.network,
      transaction: result.transaction,
      at: new Date().toISOString(),
    }).catch((err) => console.error("hcs audit failed", err));
    if (registry && prompt?.registryId && payer) {
      registry
        .issue(prompt.registryId, payer, result.transaction)
        .catch((err) => console.error("licence issue failed", err));
    }
  });

  const routes: RoutesConfig = {
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
  };

  const http = new x402HTTPResourceServer(server, routes).onProtectedRequest(
    async ({ adapter, path }) => {
      const prompt = promptFromPath(path);
      if (!registry || !identity || !prompt?.registryId) return;
      const headers = new Headers();
      for (const name of ["x-hedera-account", "x-hedera-timestamp", "x-hedera-signature"]) {
        const value = adapter.getHeader(name);
        if (value) headers.set(name, value);
      }
      const account = await identity(headers);
      if (account && (await registry.hasLicence(account, prompt.registryId)))
        return { grantAccess: true };
    },
  );
  return paymentMiddlewareFromHTTPServer(http);
}
