import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";

process.env.X402_PAY_TO_ADDRESS = "0.0.4242";

const app = createApp({
  getSupported: async () => ({ kinds: [], extensions: [], signers: {} }),
  verify: async () => ({ isValid: false }),
  settle: async () => ({ success: false, transaction: "", network: "hedera:testnet" }),
});

describe("GET /health", () => {
  it("reports the service as healthy", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, service: "bajigur-api" });
  });
});
