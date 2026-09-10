import { describe, expect, it } from "bun:test";
import type { FacilitatorClient } from "@x402/core/server";
import { createApp } from "../src/app";
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

const app = createApp(facilitator);
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
      payTo: prompt.payTo,
      asset: "0.0.429274",
      amount: "100000",
      extra: { feePayer: "0.0.999" },
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
  });
});
