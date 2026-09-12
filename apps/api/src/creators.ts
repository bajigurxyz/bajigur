import { PublicKey } from "@hiero-ledger/sdk";
import { sha256 } from "@noble/hashes/sha256";
import { Hono } from "hono";
import type { AgentClaims } from "./agent";
import { type Ens, hederaAccountOf, type Registrar } from "./ens";
import type { Publish } from "./hcs";
import { creatorOf, prompts, publicPrompt } from "./prompts";
import type { Registry } from "./registry";
import { agentIdFrom, agentRef, IDENTITY_REGISTRY, type Reputation } from "./reputation";
import type { FeedbackRow, Store } from "./store";

export type CreatorOptions = {
  ens?: Ens;
  registrar?: Registrar;
  registry?: Registry;
  reputation?: Reputation;
  store?: Store;
  publish?: Publish;
  claimsOf?: (headers: Headers) => Promise<AgentClaims | undefined>;
};

const ENS_KEY = "erc8004";
const byCreator = (name: string) => prompts.filter((p) => creatorOf(p) === name);

/// A creator is an ENS name, and that name is the reputation. The ERC-8004 agent behind it
/// is minted once, carries the name onchain, and belongs to the creator's own wallet.
export function creatorRoutes(o: CreatorOptions) {
  const app = new Hono();

  const agentOf = async (name: string) =>
    o.ens ? agentIdFrom(await o.ens.text(name, ENS_KEY)) : undefined;

  /// Lazily, because a creator who never published has nothing to be rated on.
  const ensureAgent = async (name: string, origin: string) => {
    const existing = await agentOf(name);
    if (existing) return existing;
    if (!o.reputation || !o.registrar || !o.ens || !o.registry) return undefined;
    const account = await hederaAccountOf(name, o.ens);
    const owner = await o.registry.evmOf(account);
    if (!owner) throw new Error(`${name} has no Hedera account yet`);
    const agentId = await o.reputation.registerCreator(
      name,
      owner,
      `${origin}/creators/${name}/agent.json`,
    );
    await o.registrar.setText(name, ENS_KEY, agentRef(agentId));
    return agentId;
  };

  app.get("/:name", async (c) => {
    const name = c.req.param("name");
    const mine = byCreator(name);
    if (!mine.length) return c.notFound();
    const agentId = await agentOf(name).catch(() => undefined);
    const [account, reputation, feedback] = await Promise.all([
      o.ens ? hederaAccountOf(name, o.ens).catch(() => undefined) : undefined,
      agentId && o.reputation ? o.reputation.summary(agentId).catch(() => undefined) : undefined,
      o.store?.feedbackFor(name).catch(() => []) ?? [],
    ]);
    return c.json({
      name,
      account,
      ...(agentId ? { agentId, agent: agentRef(agentId), registry: IDENTITY_REGISTRY } : {}),
      reputation: {
        likes: feedback.filter((f) => f.value > 0).length,
        dislikes: feedback.filter((f) => f.value < 0).length,
        onchain: reputation ?? null,
      },
      prompts: await Promise.all(mine.map((p) => publicPrompt(p, o.ens))),
      feedback: feedback.map(({ agentId: _a, ...rest }) => rest),
    });
  });

  /// The ERC-8004 registration file the agent's tokenURI points at.
  app.get("/:name/agent.json", async (c) => {
    const name = c.req.param("name");
    if (!byCreator(name).length) return c.notFound();
    const origin = new URL(c.req.url).origin;
    const agentId = await agentOf(name).catch(() => undefined);
    return c.json({
      type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
      name,
      description: `Design prompt creator on Bajigur. Paid directly over x402 on Hedera; rated by the wallets that bought from them.`,
      services: [
        { name: "ENS", endpoint: name, version: "v1" },
        { name: "profile", endpoint: `${origin}/creators/${name}` },
      ],
      x402Support: true,
      active: true,
      registrations: agentId ? [{ agentId, agentRegistry: `eip155:296:${IDENTITY_REGISTRY}` }] : [],
      supportedTrust: ["reputation"],
    });
  });

  /// The target of feedbackURI: the text behind an onchain rating, hash included.
  app.get("/:name/feedback/:id", async (c) => {
    const row = await o.store?.feedback(c.req.param("id"));
    if (!row || row.creator !== c.req.param("name")) return c.notFound();
    return c.json(body(row));
  });

  app.post("/:name/feedback", async (c) => {
    const name = c.req.param("name");
    const mine = byCreator(name);
    if (!mine.length) return c.notFound();
    if (!o.reputation || !o.store || !o.registry || !o.ens) {
      return c.json({ error: "reputation disabled" }, 503);
    }
    const claims = await o.claimsOf?.(c.req.raw.headers);
    if (!claims) return c.json({ error: "invalid agent token" }, 401);

    const input = (await c.req.json().catch(() => ({}))) as {
      like?: unknown;
      comment?: unknown;
      promptId?: unknown;
    };
    const value = input.like === false ? -1 : 1;
    const comment = typeof input.comment === "string" ? input.comment.trim().slice(0, 500) : "";

    // Only a buyer may rate, and only on a prompt they actually hold a licence for.
    const candidates =
      typeof input.promptId === "string" ? mine.filter((p) => p.id === input.promptId) : mine;
    const held = [] as string[];
    for (const p of candidates) {
      if (p.registryId && (await o.registry.hasLicence(claims.acct, p.registryId))) held.push(p.id);
    }
    const promptId = held[0];
    if (!promptId) return c.json({ error: "buy the prompt before rating it" }, 403);

    const account = await hederaAccountOf(name, o.ens).catch(() => undefined);
    if (account === claims.acct) return c.json({ error: "you cannot rate yourself" }, 403);

    const agentId = await ensureAgent(name, new URL(c.req.url).origin);
    if (!agentId) return c.json({ error: "this creator has no agent yet" }, 503);

    const id = crypto.randomUUID();
    const label = o.registrar ? await o.registrar.labelOf(evm(claims)).catch(() => null) : null;
    const row: FeedbackRow = {
      id,
      creator: name,
      agentId,
      promptId,
      buyerAccount: claims.acct,
      ...(label && o.registrar ? { buyerName: `${label}.${o.registrar.parent}` } : {}),
      value,
      ...(comment ? { comment } : {}),
      transactionId: "",
      at: new Date().toISOString(),
    };
    const feedbackURI = `${new URL(c.req.url).origin}/creators/${name}/feedback/${id}`;
    const transactionId = await o.reputation.giveFeedback({
      agentId,
      value,
      tag1: value > 0 ? "worth-it" : "not-worth-it",
      tag2: promptId,
      feedbackURI,
      feedbackHash: sha256(
        new TextEncoder().encode(JSON.stringify(body({ ...row, transactionId: "" }))),
      ),
      account: claims.acct,
      publicKey: PublicKey.fromStringECDSA(claims.pk),
      walletId: claims.wid,
    });
    const stored = { ...row, transactionId };
    await o.store.addFeedback(stored);
    // ponytail: the topic is the audit trail, never the query layer; failing it must not lose the rating
    o.publish?.({ type: "feedback", ...body(stored) }).catch((err) =>
      console.error("hcs feedback record failed", err),
    );
    return c.json({ ...body(stored), feedbackURI, agent: agentRef(agentId) }, 201);
  });

  return app;
}

const evm = (claims: AgentClaims) => `0x${PublicKey.fromStringECDSA(claims.pk).toEvmAddress()}`;

const body = (row: FeedbackRow) => ({
  id: row.id,
  creator: row.creator,
  promptId: row.promptId,
  by: row.buyerName ?? row.buyerAccount,
  buyerAccount: row.buyerAccount,
  value: row.value,
  like: row.value > 0,
  comment: row.comment ?? "",
  at: row.at,
  transactionId: row.transactionId,
});
