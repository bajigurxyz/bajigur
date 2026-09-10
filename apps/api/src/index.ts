import app from "./app";

const port = Number(process.env.PORT ?? 3002);

export default {
  fetch: app.fetch,
  port,
};
