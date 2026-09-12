import { platformAssociate, platformOnboard, privyLinkWallet, privySigner } from "./agent";
import { createApp } from "./app";
import { ensClient } from "./ens";
import { hcsPublisher } from "./hcs";
import { contractRegistry, signedIdentity } from "./registry";

const port = Number(process.env.PORT ?? 3002);

const signer = privySigner();
const secret = process.env.AGENT_TOKEN_SECRET;
if (!signer || !secret)
  console.warn("agent wallets disabled: set PRIVY_APP_SECRET and AGENT_TOKEN_SECRET");

const app = createApp({
  onSettled: hcsPublisher(),
  registry: contractRegistry(),
  identity: signedIdentity,
  ens: process.env.ENS_NAME ? ensClient() : undefined,
  agent:
    signer && secret
      ? {
          secret,
          signer,
          onboard: platformOnboard(signer),
          associate: platformAssociate(signer),
          linkWallet: privyLinkWallet(),
          adminKey: process.env.ADMIN_KEY,
          capUsd: process.env.AGENT_CAP_USD,
          capHbar: process.env.AGENT_CAP_HBAR,
        }
      : undefined,
});

// Behind Railway's proxy the request URL is http://; x402 and discovery echo it, so restore the public scheme.
const withForwardedProto = (req: Request) => {
  const proto = req.headers.get("x-forwarded-proto");
  if (!proto || req.url.startsWith(`${proto}:`)) return req;
  return new Request(req.url.replace(/^https?:/, `${proto}:`), req);
};

export default {
  fetch: (req: Request) => app.fetch(withForwardedProto(req)),
  port,
};
