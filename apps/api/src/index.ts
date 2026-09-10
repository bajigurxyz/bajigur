import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3002);

export default {
  fetch: createApp().fetch,
  port,
};
