import { createApp } from "./app";
import { hcsPublisher } from "./hcs";
import { contractRegistry, signedIdentity } from "./registry";

const port = Number(process.env.PORT ?? 3002);

const app = createApp({
  onSettled: hcsPublisher(),
  registry: contractRegistry(),
  identity: signedIdentity,
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
