import { describe, expect, it } from "bun:test";
import type { FacilitatorClient } from "@x402/core/server";
import { createApp } from "../src/app";

process.env.X402_PAY_TO_ADDRESS = "0.0.4242";

import { prompts } from "../src/prompts";

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

import type { Settlement } from "../src/hcs";

const settled: Settlement[] = [];
const issued: [number, string, string][] = [];
const holders = new Set<string>();
const registry = {
  issue: async (id: number, payer: string, tx: string) => {
    issued.push([id, payer, tx]);
  },
  hasLicence: async (account: string, id: number) => holders.has(`${account}:${id}`),
};
const identity = async (headers: Headers) => headers.get("x-hedera-account") ?? undefined;
const app = createApp({
  facilitator,
  registry,
  identity,
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
    expect(body.items[0]).toMatchObject({
      resource: "http://api.test/prompts/hero-scroll-reveal/unlock",
      type: "http",
      serviceName: "Bajigur",
      accepts: [
        { scheme: "exact", network, asset: "0.0.429274", amount: "100000", payTo: "0.0.4242" },
        { scheme: "exact", network, asset: "0.0.0", amount: "100000000", payTo: "0.0.4242" },
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
    expect(hbar).toMatchObject({ asset: "0.0.0", amount: "100000000", payTo: "0.0.4242" });
    expect(accept).toMatchObject({
      scheme: "exact",
      network,
      payTo: "0.0.4242",
      asset: "0.0.429274",
      amount: "100000",
      extra: { feePayer: "0.0.999" },
    });
    expect(required.extensions.bazaar.info.input).toMatchObject({
      type: "http",
      method: "GET",
      pathParams: { id: "hero-scroll-reveal" },
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
      amount: "100000",
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

  it("lists the prompts an account holds a licence for", async () => {
    holders.add(`0.0.5555:${prompt.registryId}`);
    const res = await app.request("/licenses/0.0.5555");
    const list = (await res.json()) as { id: string }[];
    expect(list.map((p) => p.id)).toEqual([prompt.id]);
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
