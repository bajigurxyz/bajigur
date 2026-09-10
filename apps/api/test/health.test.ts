import { describe, expect, it } from "bun:test";
import { app } from "../src/app";

describe("GET /health", () => {
  it("reports the service as healthy", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, service: "bajigur-api" });
  });
});
