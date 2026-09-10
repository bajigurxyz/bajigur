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
const app = createApp(facilitator, async (s) => {
  settled.push(s);
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

  it("answers 402 with the creator as payTo and the prompt price in USDC", async () => {
    const res = await app.request(`/prompts/${prompt.id}/unlock`);
    expect(res.status).toBe(402);
    const required = decode(res.headers.get("PAYMENT-REQUIRED") ?? "");
    const [accept] = required.accepts;
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
  });
});
