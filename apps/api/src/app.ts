import { APP_NAME } from "@bajigur/core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { type AgentOptions, agentRoutes } from "./agent";
import { hederaAccountOf } from "./ens";
import { agentCard, openapi } from "./meta";
import { findPrompt, payToOf, platformAccount, prompts, publicPrompt } from "./prompts";
import { requirementsFor, service, type X402Options, x402 } from "./x402";

export type AppOptions = X402Options & { agent?: Omit<AgentOptions, "allowedPayTo"> };

export function createApp({ agent, ...options }: AppOptions = {}) {
  platformAccount();
  const app = new Hono();

  let identity = options.identity;
  if (agent) {
    const allowedPayTo = async () =>
      new Set(await Promise.all(prompts.map((p) => payToOf(p, options.ens))));
    const routes = agentRoutes({ ...agent, allowedPayTo });
    app.route("/agent", routes.app);
    const fallback = options.identity;
    identity = async (headers) =>
      (await routes.identity(headers)) ?? (fallback ? fallback(headers) : undefined);
  }

  app.use("*", logger());
  app.use("*", cors());

  app.get("/health", (c) => c.json({ ok: true, service: `${APP_NAME}-api` }));

  app.get("/openapi.json", (c) => c.json(openapi(new URL(c.req.url).origin)));
  app.get("/.well-known/agent.json", (c) => c.json(agentCard(new URL(c.req.url).origin)));

  app.get("/prompts", async (c) =>
    c.json(await Promise.all(prompts.map((p) => publicPrompt(p, options.ens)))),
  );
  app.get("/prompts/:id", async (c) => {
    const prompt = findPrompt(c.req.param("id"));
    return prompt ? c.json(await publicPrompt(prompt, options.ens)) : c.notFound();
  });

  app.get("/discovery/resources", async (c) => {
    const origin = new URL(c.req.url).origin;
    const items = await Promise.all(
      prompts.map(async (p) => ({
        resource: `${origin}/prompts/${p.id}/unlock`,
        type: "http",
        x402Version: 2,
        accepts: await requirementsFor(p, options.ens),
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
    const param = c.req.param("account");
    const account = options.ens ? await hederaAccountOf(param, options.ens) : param;
    const owned = await Promise.all(
      prompts.map(async (p) =>
        p.registryId && (await registry.hasLicence(account, p.registryId)) ? p : undefined,
      ),
    );
    return c.json(
      await Promise.all(
        owned.filter((p) => p !== undefined).map((p) => publicPrompt(p, options.ens)),
      ),
    );
  });

  app.use("/prompts/:id/unlock", async (c, next) =>
    findPrompt(c.req.param("id")) ? await next() : c.notFound(),
  );
  app.use(x402({ ...options, identity }));
  app.get("/prompts/:id/unlock", (c) => {
    const prompt = findPrompt(c.req.param("id"));
    return prompt ? c.json({ id: prompt.id, body: prompt.body }) : c.notFound();
  });

  return app;
}
