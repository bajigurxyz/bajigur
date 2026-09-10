import { APP_NAME } from "@bajigur/core";
import type { FacilitatorClient } from "@x402/core/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { OnSettled } from "./hcs";
import { findPrompt, payToOf, prompts, publicPrompt } from "./prompts";
import { requirementsFor, service, x402 } from "./x402";

export function createApp(facilitator?: FacilitatorClient, onSettled?: OnSettled) {
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

  app.get("/discovery/resources", async (c) => {
    const origin = new URL(c.req.url).origin;
    const items = await Promise.all(
      prompts.map(async (p) => ({
        resource: `${origin}/prompts/${p.id}/unlock`,
        type: "http",
        x402Version: 2,
        accepts: [await requirementsFor(p)],
        lastUpdated: new Date().toISOString(),
        description: `${p.title}: ${p.preview}`,
        mimeType: "application/json",
        ...service,
        tags: [...service.tags, ...p.tags],
      })),
    );
    return c.json({
      x402Version: 2,
      items,
      pagination: { limit: items.length, offset: 0, total: items.length },
    });
  });

  app.use("/prompts/:id/unlock", async (c, next) =>
    findPrompt(c.req.param("id")) ? await next() : c.notFound(),
  );
  app.use(x402(facilitator, onSettled));
  app.get("/prompts/:id/unlock", (c) => {
    const prompt = findPrompt(c.req.param("id"));
    return prompt ? c.json({ id: prompt.id, body: prompt.body }) : c.notFound();
  });

  return app;
}
