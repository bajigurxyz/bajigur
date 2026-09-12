import { APP_NAME } from "@bajigur/core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { type AgentClaims, type AgentOptions, agentRoutes, evmOf } from "./agent";
import { creatorRoutes } from "./creators";
import { hederaAccountOf, isValidLabel, type Registrar } from "./ens";
import type { Publish } from "./hcs";
import { agentCard, openapi } from "./meta";
import {
  addPrompt,
  findPrompt,
  loadPrompts,
  payToOf,
  platformAccount,
  prompts,
  publicPrompt,
  removePrompt,
  slugFor,
  tinybars,
} from "./prompts";
import { atomic, rateLimit, validate } from "./publish";
import type { Reputation } from "./reputation";
import type { Store } from "./store";
import { requirementsFor, service, type X402Options, x402 } from "./x402";

export type AppOptions = X402Options & {
  agent?: Omit<AgentOptions, "allowedPayTo">;
  registrar?: Registrar;
  store?: Store;
  reputation?: Reputation;
  publish?: Publish;
};

export function createApp({
  agent,
  registrar,
  store,
  reputation,
  publish,
  ...options
}: AppOptions = {}) {
  platformAccount();
  const app = new Hono();

  let identity = options.identity;
  let claimsOf: ((headers: Headers) => Promise<AgentClaims | undefined>) | undefined;
  if (agent) {
    const allowedPayTo = async () =>
      new Set(await Promise.all(prompts.map((p) => payToOf(p, options.ens))));
    const routes = agentRoutes({ ...agent, allowedPayTo, nameOf: nameOf(registrar) });
    app.route("/agent", routes.app);
    claimsOf = routes.claims;
    const fallback = options.identity;
    identity = async (headers) =>
      (await routes.identity(headers)) ?? (fallback ? fallback(headers) : undefined);
  }

  app.use("*", logger());
  app.use("*", cors());

  // Published prompts live in Postgres so they survive a deploy; the array stays the
  // catalogue everything else reads, refreshed lazily so a second instance sees new rows.
  if (store) {
    let at = 0;
    let inflight: Promise<void> | undefined;
    app.use("*", async (_c, next) => {
      if (Date.now() - at > 30_000 && !inflight) {
        at = Date.now();
        inflight = store
          .all()
          .then(loadPrompts)
          .catch((err) => console.error("catalogue refresh failed", err))
          .finally(() => {
            inflight = undefined;
          });
      }
      if (inflight) await inflight;
      await next();
    });
  }

  app.get("/health", (c) => c.json({ ok: true, service: `${APP_NAME}-api` }));

  app.get("/openapi.json", (c) => c.json(openapi(new URL(c.req.url).origin)));
  app.get("/.well-known/agent.json", (c) => c.json(agentCard(new URL(c.req.url).origin)));

  app.route(
    "/creators",
    creatorRoutes({
      ens: options.ens,
      registrar,
      registry: options.registry,
      reputation,
      store,
      publish,
      claimsOf: (headers) => claimsOf?.(headers) ?? Promise.resolve(undefined),
    }),
  );

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

  // A name under the parent is how a creator gets paid: the platform sends the Sepolia
  // transaction, the user owns the name, and its bajigur.hedera record is written in the
  // same transaction so a claimed name can never point payments at the platform.
  app.get("/ens/available", async (c) => {
    const label = c.req.query("label") ?? "";
    if (!registrar) return c.json({ error: "name claiming disabled" }, 503);
    if (!isValidLabel(label)) return c.json({ available: false, error: "invalid label" }, 400);
    return c.json({ available: await registrar.available(label) });
  });

  app.post("/ens/claim", async (c) => {
    if (!registrar) return c.json({ error: "name claiming disabled" }, 503);
    const claims = await claimsOf?.(c.req.raw.headers);
    if (!claims) return c.json({ error: "invalid agent token" }, 401);
    const { label } = (await c.req.json().catch(() => ({}))) as { label?: string };
    if (!label || !isValidLabel(label)) return c.json({ error: "invalid label" }, 400);

    const owner = evmOf(claims.pk);
    const taken = await registrar.labelOf(owner);
    if (taken)
      return c.json({ error: `this wallet already owns ${taken}.${registrar.parent}` }, 409);
    if (!(await registrar.available(label))) return c.json({ error: "label is taken" }, 409);

    const transaction = await registrar.claim(label, owner, claims.acct);
    return c.json({ name: `${label}.${registrar.parent}`, hedera: claims.acct, transaction });
  });

  // Publishing: the body is the product, so it is stored, hashed onchain and never
  // returned without a licence. payTo comes from the token, never the request.
  const allowPublish = rateLimit(Number(process.env.PUBLISH_PER_HOUR ?? 5));
  app.post("/prompts", async (c) => {
    const { registry } = options;
    if (!store || !registry) return c.json({ error: "publishing disabled" }, 503);
    const claims = await claimsOf?.(c.req.raw.headers);
    if (!claims) return c.json({ error: "invalid agent token" }, 401);
    const checked = validate((await c.req.json().catch(() => ({}))) as Record<string, unknown>);
    if ("error" in checked) return c.json({ error: checked.error }, 400);
    if (!allowPublish(claims.acct)) return c.json({ error: "too many prompts published" }, 429);

    const name = nameOf(registrar);
    const creator = (await name?.(evmOf(claims.pk)).catch(() => null)) ?? undefined;
    const prompt = {
      ...checked.prompt,
      id: slugFor(checked.prompt.title),
      payTo: claims.acct,
      ...(creator ? { creator } : {}),
    };
    const { id, transactionId } = await registry.register({
      contentHash: new Uint8Array(new Bun.CryptoHasher("sha256").update(prompt.body).digest()),
      payTo: prompt.payTo,
      priceUsdc: Number(atomic(prompt.priceUsd, 6)),
      priceTinybar: Number(tinybars(prompt.priceHbar)),
      uri: prompt.previewMedia ?? `bajigur:${prompt.id}`,
    });
    const published = { ...prompt, registryId: id };
    await store.add(published);
    addPrompt(published);
    return c.json(
      {
        id: published.id,
        registryId: id,
        payTo: published.payTo,
        creator: published.creator,
        transaction: transactionId,
      },
      201,
    );
  });

  // Unpublishing, so a creator can take back a mistake. The onchain registration and any
  // licence already sold stay: the catalogue is ours to edit, the chain is the record.
  app.delete("/prompts/:id", async (c) => {
    const id = c.req.param("id");
    const prompt = findPrompt(id);
    if (!prompt) return c.notFound();
    if (!store) return c.json({ error: "publishing disabled" }, 503);
    if (!prompt.payTo) return c.json({ error: "seed prompts cannot be unpublished" }, 403);
    const claims = await claimsOf?.(c.req.raw.headers);
    if (!claims) return c.json({ error: "invalid agent token" }, 401);
    if (claims.acct !== prompt.payTo) return c.json({ error: "not your prompt" }, 403);
    await store.remove(id);
    removePrompt(id);
    return c.json({ id, unpublished: true });
  });

  // Who bought a prompt, for its creator only: a public buyer list is a public list of
  // who bought what. The ERC-1155 log is the source, because the balance is what actually
  // grants access, so this can never disagree with who can open the prompt.
  app.get("/prompts/:id/buyers", async (c) => {
    const { registry } = options;
    const prompt = findPrompt(c.req.param("id"));
    if (!prompt) return c.notFound();
    if (!registry) return c.json({ error: "licences disabled" }, 503);
    const claims = await claimsOf?.(c.req.raw.headers);
    if (!claims) return c.json({ error: "invalid agent token" }, 401);
    if (claims.acct !== (await payToOf(prompt, options.ens))) {
      return c.json({ error: "not your prompt" }, 403);
    }
    if (!prompt.registryId) return c.json([]);

    const name = nameOf(registrar);
    return c.json(
      await Promise.all(
        (await registry.buyers(prompt.registryId)).map(async (buyer) => {
          const [account, ensName] = await Promise.all([
            registry.accountOf(buyer.address),
            name?.(buyer.address).catch(() => null) ?? null,
          ]);
          return {
            ...buyer,
            ...(account ? { account } : {}),
            ...(ensName ? { name: ensName } : {}),
          };
        }),
      ),
    );
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

const nameOf = (registrar?: Registrar) =>
  registrar &&
  (async (address: string) => {
    const label = await registrar.labelOf(address);
    return label && `${label}.${registrar.parent}`;
  });
