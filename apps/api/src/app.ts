import { APP_NAME } from "@bajigur/core";
import type { FacilitatorClient } from "@x402/core/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { findPrompt, payToOf, prompts, publicPrompt } from "./prompts";
import { x402 } from "./x402";

export function createApp(facilitator?: FacilitatorClient) {
  for (const prompt of prompts) payToOf(prompt);
  const app = new Hono();

  app.use("*", logger());
  app.use("*", cors());

  app.get("/health", (c) => c.json({ ok: true, service: `${APP_NAME}-api` }));

  app.get("/prompts", (c) => c.json(prompts.map(publicPrompt)));
  app.get("/prompts/:id", (c) => {
    const prompt = findPrompt(c.req.param("id"));
    return prompt ? c.json(publicPrompt(prompt)) : c.notFound();
  });

  app.use("/prompts/:id/unlock", async (c, next) =>
    findPrompt(c.req.param("id")) ? await next() : c.notFound(),
  );
  app.use(x402(facilitator));
  app.get("/prompts/:id/unlock", (c) => {
    const prompt = findPrompt(c.req.param("id"));
    return prompt ? c.json({ id: prompt.id, body: prompt.body }) : c.notFound();
  });

  return app;
}
