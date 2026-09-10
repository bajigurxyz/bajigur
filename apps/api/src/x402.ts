import {
  type FacilitatorClient,
  HTTPFacilitatorClient,
  x402ResourceServer,
} from "@x402/core/server";
import { ExactHederaScheme } from "@x402/hedera/exact/server";
import { paymentMiddleware } from "@x402/hono";
import { findPrompt } from "./prompts";

const network = `hedera:${process.env.HEDERA_NETWORK ?? "testnet"}` as `hedera:${string}`;
const facilitatorUrl = process.env.X402_FACILITATOR_URL ?? "https://api.testnet.blocky402.com";

const promptFromPath = (path: string) => findPrompt(path.split("/")[2] ?? "");

export function x402(
  facilitator: FacilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl }),
) {
  const server = new x402ResourceServer(facilitator).register("hedera:*", new ExactHederaScheme());
  return paymentMiddleware(
    {
      "GET /prompts/:id/unlock": {
        accepts: {
          scheme: "exact",
          network,
          price: ({ path }) => `$${promptFromPath(path)?.priceUsd ?? "0"}`,
          payTo: ({ path }) => promptFromPath(path)?.payTo ?? "",
        },
        description: "Full prompt body from the Bajigur design prompt marketplace",
        mimeType: "application/json",
      },
    },
    server,
  );
}
