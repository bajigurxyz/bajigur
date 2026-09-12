import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  getClient,
  isRegisteredRedirect,
  issueCode,
  redeemCode,
  registerClient,
} from "@/lib/oauth";

const REDIRECT = "http://localhost:9999/callback";
const VERIFIER = "a-verifier-long-enough-to-be-real-43-chars-x";
const CHALLENGE = createHash("sha256").update(VERIFIER).digest("base64url");

const codeFor = (client: string, redirect = REDIRECT, challenge = CHALLENGE) =>
  issueCode({ clientId: client, redirectUri: redirect, codeChallenge: challenge, token: "agent" });

describe("registered clients", () => {
  it("reads back a client it never stored", () => {
    // The whole point: registration keeps no state, so any instance can serve
    // a consent request that another instance started.
    const { clientId } = registerClient([REDIRECT], "pretend-claude");

    expect(getClient(clientId)).toEqual({
      clientId,
      redirectUris: [REDIRECT],
      name: "pretend-claude",
    });
  });

  it("refuses an id we did not issue", () => {
    expect(getClient("made-up")).toBeUndefined();
    expect(getClient("a.b.c")).toBeUndefined();
  });

  it("refuses a tampered id", () => {
    const { clientId } = registerClient([REDIRECT]);
    const [iv, body, tag] = clientId.split(".");
    const flipped = `${iv}.${body.slice(0, -1)}${body.at(-1) === "A" ? "B" : "A"}.${tag}`;

    expect(getClient(flipped)).toBeUndefined();
  });

  it("matches redirect URIs exactly, never by prefix", () => {
    const client = registerClient([REDIRECT]);

    expect(isRegisteredRedirect(client, REDIRECT)).toBe(true);
    expect(isRegisteredRedirect(client, `${REDIRECT}/../evil`)).toBe(false);
    expect(isRegisteredRedirect(client, "http://localhost:9999/callback.evil")).toBe(false);
  });
});

describe("redeeming a code", () => {
  it("returns the token to the client that holds the verifier", () => {
    expect(redeemCode(codeFor("client-a"), "client-a", REDIRECT, VERIFIER)).toEqual({
      ok: true,
      token: "agent",
    });
  });

  it("refuses the wrong verifier", () => {
    expect(redeemCode(codeFor("client-a"), "client-a", REDIRECT, "wrong")).toEqual({
      ok: false,
      error: "invalid_grant",
    });
  });

  it("refuses a different client presenting the code", () => {
    expect(redeemCode(codeFor("client-a"), "client-b", REDIRECT, VERIFIER)).toEqual({
      ok: false,
      error: "invalid_client",
    });
  });

  it("refuses a redirect the code was not issued for", () => {
    expect(redeemCode(codeFor("client-a"), "client-a", "http://evil/cb", VERIFIER)).toEqual({
      ok: false,
      error: "invalid_grant",
    });
  });

  it("refuses a forged code", () => {
    expect(redeemCode("not.a.code", "client-a", REDIRECT, VERIFIER)).toEqual({
      ok: false,
      error: "invalid_grant",
    });
  });

  it("refuses a code past its minute", () => {
    const now = Date.now;
    const code = codeFor("client-a");
    Date.now = () => now() + 61_000;
    try {
      expect(redeemCode(code, "client-a", REDIRECT, VERIFIER)).toEqual({
        ok: false,
        error: "invalid_grant",
      });
    } finally {
      Date.now = now;
    }
  });
});
