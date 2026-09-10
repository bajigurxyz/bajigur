import { createApp } from "./app";
import { hcsPublisher } from "./hcs";

const port = Number(process.env.PORT ?? 3002);

export default {
  fetch: createApp(undefined, hcsPublisher()).fetch,
  port,
};
