import { describe, expect, it } from "bun:test";
import type { FacilitatorClient } from "@x402/core/server";
import { createApp } from "../src/app";

process.env.X402_PAY_TO_ADDRESS = "0.0.4242";
process.env.ENS_NAME = "bajigur.eth";

import { payToOf, prompts, tinybars } from "../src/prompts";

const usdc = (usd: string) => String(Math.round(Number(usd) * 1_000_000));

const network = "hedera:testnet";

const facilitator: FacilitatorClient = {
  getSupported: async () => ({
    kinds: [{ x402Version: 2, scheme: "exact", network, extra: { feePayer: "0.0.999" } }],
    extensions: [],
    signers: {},
  }),
  verify: async () => ({ isValid: true, payer: "0.0.1234" }),
  settle: async () => ({ success: true, transaction: "0.0.1234@1.0", network, payer: "0.0.1234" }),
};

import { agentTokens } from "../src/agent";
import type { Settlement } from "../src/hcs";

const settled: Settlement[] = [];
const issued: [number, string, string][] = [];
const holders = new Set<string>();
const registry = {
  issue: async (id: number, payer: string, tx: string) => {
    issued.push([id, payer, tx]);
  },
  hasLicence: async (account: string, id: number) => holders.has(`${account}:${id}`),
  buyers: async () => [
    {
      address: "0xa8f70558b1235769f99add8fe665752ca18d1f8a",
      transactionId: "0.0.7@1.0",
      at: "2026-09-12T08:55:18.000Z",
    },
  ],
  accountOf: async () => "0.0.5555",
};
const identity = async (headers: Headers) => headers.get("x-hedera-account") ?? undefined;
const records: Record<string, string> = {
  "kiel.bajigur.eth:bajigur.hedera": "0.0.4242",
  "buyer.bajigur.eth:bajigur.hedera": "0.0.5555",
};
const ens = { text: async (name: string, key: string) => records[`${name}:${key}`] ?? null };
const app = createApp({
  facilitator,
  registry,
  identity,
  ens,
  onSettled: async (s) => {
    settled.push(s);
  },
});
const decode = (header: string) => JSON.parse(Buffer.from(header, "base64").toString());
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64");

describe("catalogue", () => {
  it("lists prompts without their body", async () => {
    const res = await app.request("/prompts");
    const list = (await res.json()) as Record<string, unknown>[];
    expect(res.status).toBe(200);
    expect(list).toHaveLength(prompts.length);
    expect(list[0]).not.toHaveProperty("body");
  });

  it("serves an openapi spec and an erc-8004 agent card", async () => {
    const spec = (await (await app.request("http://api.test/openapi.json")).json()) as {
      openapi: string;
      servers: { url: string }[];
      paths: Record<string, unknown>;
    };
    expect(spec.openapi).toBe("3.0.3");
    expect(spec.servers[0]?.url).toBe("http://api.test");
    expect(Object.keys(spec.paths)).toContain("/prompts/{id}/unlock");

    const card = (await (await app.request("http://api.test/.well-known/agent.json")).json()) as {
      type: string;
      x402Support: boolean;
      services: { name: string; endpoint: string }[];
    };
    expect(card.type).toContain("eip-8004");
    expect(card.x402Support).toBe(true);
    expect(card.services.map((s) => s.name)).toContain("x402-discovery");
  });

  it("publishes a discovery directory in the x402 bazaar shape", async () => {
    const res = await app.request("http://api.test/discovery/resources");
    const body = (await res.json()) as {
      items: Record<string, unknown>[];
      pagination: { total: number };
    };
    expect(body.pagination.total).toBe(prompts.length);
    const first = prompts[0] as (typeof prompts)[number];
    expect(body.items[0]).toMatchObject({
      resource: `http://api.test/prompts/${first.id}/unlock`,
      type: "http",
      serviceName: "Bajigur",
      accepts: [
        {
          scheme: "exact",
          network,
          asset: "0.0.429274",
          amount: usdc(first.priceUsd),
          payTo: "0.0.4242",
        },
        {
          scheme: "exact",
          network,
          asset: "0.0.0",
          amount: tinybars(first.priceHbar),
          payTo: "0.0.4242",
        },
      ],
    });
  });

  it("404s unknown prompts, paid or not", async () => {
    expect((await app.request("/prompts/nope")).status).toBe(404);
    expect((await app.request("/prompts/nope/unlock")).status).toBe(404);
  });
});

describe("GET /prompts/:id/unlock", () => {
  const prompt = prompts[0] as (typeof prompts)[number];

  it("answers 402 with the creator as payTo, priced in USDC and HBAR", async () => {
    const res = await app.request(`/prompts/${prompt.id}/unlock`);
    expect(res.status).toBe(402);
    const required = decode(res.headers.get("PAYMENT-REQUIRED") ?? "");
    const [accept, hbar] = required.accepts;
    expect(hbar).toMatchObject({
      asset: "0.0.0",
      amount: tinybars(prompt.priceHbar),
      payTo: "0.0.4242",
    });
    expect(accept).toMatchObject({
      scheme: "exact",
      network,
      payTo: "0.0.4242",
      asset: "0.0.429274",
      amount: usdc(prompt.priceUsd),
      extra: { feePayer: "0.0.999" },
    });
    expect(required.extensions.bazaar.info.input).toMatchObject({
      type: "http",
      method: "GET",
      pathParams: { id: prompt.id },
    });
  });

  it("returns the body once the facilitator settles", async () => {
    const first = await app.request(`/prompts/${prompt.id}/unlock`);
    const required = decode(first.headers.get("PAYMENT-REQUIRED") ?? "");
    const payload = {
      x402Version: 2,
      resource: required.resource,
      accepted: required.accepts[0],
      payload: { transaction: "AAAA" },
    };
    const res = await app.request(`/prompts/${prompt.id}/unlock`, {
      headers: { "PAYMENT-SIGNATURE": encode(payload) },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: prompt.id, body: prompt.body });
    expect(decode(res.headers.get("PAYMENT-RESPONSE") ?? "")).toMatchObject({ success: true });
    expect(settled).toHaveLength(1);
    expect(settled[0]).toMatchObject({
      promptId: prompt.id,
      payer: "0.0.1234",
      payTo: "0.0.4242",
      asset: "0.0.429274",
      amount: usdc(prompt.priceUsd),
      network,
      transaction: "0.0.1234@1.0",
    });
    expect(issued).toEqual([[prompt.registryId as number, "0.0.1234", "0.0.1234@1.0"]]);
  });

  it("lets a licence holder in without paying", async () => {
    holders.add(`0.0.5555:${prompt.registryId}`);
    const res = await app.request(`/prompts/${prompt.id}/unlock`, {
      headers: { "x-hedera-account": "0.0.5555" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: prompt.id, body: prompt.body });
    expect(res.headers.get("PAYMENT-RESPONSE")).toBeNull();

    const other = await app.request(`/prompts/${prompts[1]?.id}/unlock`, {
      headers: { "x-hedera-account": "0.0.5555" },
    });
    expect(other.status).toBe(402);
  });

  it("lets the Bazantic gateway unlock with the shared key", async () => {
    process.env.GATEWAY_KEY = "gw-secret";
    const res = await app.request(`/prompts/${prompt.id}/unlock`, {
      headers: { "x-bajigur-gateway-key": "gw-secret" },
    });
    expect(res.status).toBe(200);
    const wrong = await app.request(`/prompts/${prompt.id}/unlock`, {
      headers: { "x-bajigur-gateway-key": "nope" },
    });
    expect(wrong.status).toBe(402);
    process.env.GATEWAY_KEY = undefined;
  });

  it("lists the prompts an account holds a licence for, by account or ENS name", async () => {
    holders.add(`0.0.5555:${prompt.registryId}`);
    for (const who of ["0.0.5555", "buyer.bajigur.eth"]) {
      const res = await app.request(`/licenses/${who}`);
      const list = (await res.json()) as { id: string }[];
      expect(list.map((p) => p.id)).toEqual([prompt.id]);
    }
  });

  it("exposes the creator's ENS name and resolves payTo from its record", async () => {
    const res = await app.request(`/prompts/${prompt.id}`);
    expect(await res.json()).toMatchObject({ creator: "kiel.bajigur.eth", payTo: "0.0.4242" });
  });
});

describe("tinybars", () => {
  it("converts decimal HBAR to tinybars without floats", async () => {
    const { tinybars } = await import("../src/prompts");
    expect(tinybars("1")).toBe("100000000");
    expect(tinybars("0.2")).toBe("20000000");
    expect(tinybars("0.00000001")).toBe("1");
    expect(tinybars("12.5")).toBe("1250000000");
  });
});

describe("buyers", () => {
  const paid = prompts.find((p) => p.registryId)!;

  it("needs an agent token, and a prompt that exists", async () => {
    expect((await app.request(`/prompts/${paid.id}/buyers`)).status).toBe(401);
    expect((await app.request("/prompts/nope/buyers")).status).toBe(404);
  });

  it("answers the creator with the buyer's account and name", async () => {
    const named = createApp({
      facilitator,
      registry,
      ens,
      registrar: {
        parent: "bajigur.eth",
        available: async () => true,
        labelOf: async () => "buyer",
        claim: async () => "0x0",
      },
      agent: {
        secret: "s",
        signer: { signHash: async () => new Uint8Array(65) },
        adminKey: "admin",
      },
    });
    const token = await agentTokens("s").issue({
      sub: "u",
      wid: "w",
      acct: await payToOf(paid, ens),
      pk: "02",
      cap: "1",
    });
    const res = await named.request(`/prompts/${paid.id}/buyers`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(await res.json()).toEqual([
      {
        address: "0xa8f70558b1235769f99add8fe665752ca18d1f8a",
        transactionId: "0.0.7@1.0",
        at: "2026-09-12T08:55:18.000Z",
        account: "0.0.5555",
        name: "buyer.bajigur.eth",
      },
    ]);

    const other = await agentTokens("s").issue({
      sub: "u",
      wid: "w",
      acct: "0.0.9999",
      pk: "02",
      cap: "1",
    });
    const denied = await named.request(`/prompts/${paid.id}/buyers`, {
      headers: { authorization: `Bearer ${other}` },
    });
    expect(denied.status).toBe(403);
  });
});
