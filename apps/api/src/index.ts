import { createApp } from "./app";
import { hcsPublisher } from "./hcs";
import { contractRegistry, signedIdentity } from "./registry";

const port = Number(process.env.PORT ?? 3002);

export default {
  fetch: createApp({
    onSettled: hcsPublisher(),
    registry: contractRegistry(),
    identity: signedIdentity,
  }).fetch,
  port,
};
