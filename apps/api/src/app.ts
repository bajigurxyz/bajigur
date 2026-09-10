import { APP_NAME } from "@bajigur/core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { agentCard, openapi } from "./meta";
import { findPrompt, payToOf, prompts, publicPrompt } from "./prompts";
import { requirementsFor, service, type X402Options, x402 } from "./x402";

export function createApp(options: X402Options = {}) {
  for (const prompt of prompts) payToOf(prompt);
  const app = new Hono();

  app.use("*", logger());
  app.use("*", cors());

  app.get("/health", (c) => c.json({ ok: true, service: `${APP_NAME}-api` }));

  app.get("/openapi.json", (c) => c.json(openapi(new URL(c.req.url).origin)));
  app.get("/.well-known/agent.json", (c) => c.json(agentCard(new URL(c.req.url).origin)));

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
        accepts: await requirementsFor(p),
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

  app.get("/licenses/:account", async (c) => {
    const { registry } = options;
    if (!registry) return c.json({ error: "licences disabled" }, 503);
    const account = c.req.param("account");
    const owned = await Promise.all(
      prompts.map(async (p) =>
        p.registryId && (await registry.hasLicence(account, p.registryId)) ? p : undefined,
      ),
    );
    return c.json(owned.filter((p) => p !== undefined).map(publicPrompt));
  });

  app.use("/prompts/:id/unlock", async (c, next) =>
    findPrompt(c.req.param("id")) ? await next() : c.notFound(),
  );
  app.use(x402(options));
  app.get("/prompts/:id/unlock", (c) => {
    const prompt = findPrompt(c.req.param("id"));
    return prompt ? c.json({ id: prompt.id, body: prompt.body }) : c.notFound();
  });

  return app;
}
