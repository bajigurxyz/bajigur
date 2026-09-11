import { describe, expect, it } from "bun:test";
import {
  AccountId,
  Client,
  PrivateKey,
  TokenId,
  TransactionId,
  TransferTransaction,
} from "@hiero-ledger/sdk";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";
import type { FacilitatorClient } from "@x402/core/server";
import { checkTransfer, type Signer } from "../src/agent";
import { createApp } from "../src/app";
import { prompts } from "../src/prompts";

process.env.X402_PAY_TO_ADDRESS = "0.0.4242";
process.env.ENS_NAME = undefined;

const key = PrivateKey.generateECDSA();
const evm = `0x${key.publicKey.toEvmAddress()}`;
const signed: Uint8Array[] = [];
// Mimics Privy secp256k1_sign: sign the given hash directly, return 65-byte r||s||v.
const signer: Signer = {
  signHash: async (_wallet, hash) => {
    signed.push(hash);
    const sig = secp256k1.sign(hash, key.toBytesRaw());
    return new Uint8Array([...sig.toCompactRawBytes(), sig.recovery ?? 0]);
  },
};

const facilitator: FacilitatorClient = {
  getSupported: async () => ({
    kinds: [
      {
        x402Version: 2,
        scheme: "exact",
        network: "hedera:testnet",
        extra: { feePayer: "0.0.999" },
      },
    ],
    extensions: [],
    signers: {},
  }),
  verify: async () => ({ isValid: false }),
  settle: async () => ({ success: false, transaction: "", network: "hedera:testnet" }),
};
const holders = new Set<string>();
const app = createApp({
  facilitator,
  registry: { issue: async () => {}, hasLicence: async (a, id) => holders.has(`${a}:${id}`) },
  identity: async () => undefined,
  agent: {
    secret: "test-secret",
    signer,
    onboard: async () => "0.0.7777",
    adminKey: "admin",
    capUsd: "0.10",
    capHbar: "1",
  },
});

const client = Client.forTestnet();
const usdc = TokenId.fromString("0.0.429274");
function transferBody(from: string, to: string, amount: number, asset: "usdc" | "hbar" = "usdc") {
  const tx = new TransferTransaction().setTransactionId(
    TransactionId.generate(AccountId.fromString("0.0.999")),
  );
  if (asset === "usdc") {
    tx.addTokenTransfer(usdc, AccountId.fromString(from), -amount).addTokenTransfer(
      usdc,
      AccountId.fromString(to),
      amount,
    );
  } else {
    tx.addHbarTransfer(AccountId.fromString(from), -amount).addHbarTransfer(
      AccountId.fromString(to),
      amount,
    );
  }
  tx.freezeWith(client);
  return tx.signableNodeBodyBytesList[0]?.signableTransactionBodyBytes as Uint8Array;
}

describe("checkTransfer", () => {
  const claims = { acct: "0.0.7777", cap: "0.10" };
  const allowed = new Set(["0.0.4242"]);
  it("accepts a capped USDC transfer from the agent to a creator", () => {
    expect(() =>
      checkTransfer(transferBody("0.0.7777", "0.0.4242", 100_000), claims, allowed, "1"),
    ).not.toThrow();
  });
  it("rejects over-cap, wrong payer, unknown payee", () => {
    expect(() =>
      checkTransfer(transferBody("0.0.7777", "0.0.4242", 100_001), claims, allowed, "1"),
    ).toThrow(/cap/);
    expect(() => checkTransfer(transferBody("0.0.1", "0.0.4242", 1), claims, allowed, "1")).toThrow(
      /agent's account/,
    );
    expect(() => checkTransfer(transferBody("0.0.7777", "0.0.5", 1), claims, allowed, "1")).toThrow(
      /creator/,
    );
    expect(() =>
      checkTransfer(transferBody("0.0.7777", "0.0.4242", 2e8, "hbar"), claims, allowed, "1"),
    ).toThrow(/cap/);
  });
});

describe("agent routes", () => {
  const link = () =>
    app.request("/agent/link", {
      method: "POST",
      headers: { "content-type": "application/json", "x-bajigur-admin": "admin" },
      body: JSON.stringify({ walletId: "w1", address: evm }),
    });

  it("links a wallet: recovers the key, onboards, issues a token", async () => {
    const res = await link();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      token: string;
      account: string;
      publicKey: string;
      cap: string;
    };
    expect(body.account).toBe("0.0.7777");
    expect(body.publicKey).toBe(key.publicKey.toStringRaw());
    expect(body.cap).toBe("0.10");
    const me = await app.request("/agent/me", {
      headers: { authorization: `Bearer ${body.token}` },
    });
    expect(await me.json()).toMatchObject({ account: "0.0.7777", walletId: "w1" });
  });

  it("refuses to link without the admin key or a Privy token", async () => {
    const res = await app.request("/agent/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ walletId: "w1", address: evm }),
    });
    expect(res.status).toBe(400);
  });

  it("signs only transfers that pass the checks", async () => {
    const { token } = (await (await link()).json()) as { token: string };
    const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    const ok = transferBody("0.0.7777", "0.0.4242", 20_000);
    const res = await app.request("/agent/sign", {
      method: "POST",
      headers,
      body: JSON.stringify({ bodyBytes: Buffer.from(ok).toString("base64") }),
    });
    expect(res.status).toBe(200);
    const { signature } = (await res.json()) as { signature: string };
    expect(signature).toHaveLength(128);
    expect(key.publicKey.verify(ok, Buffer.from(signature, "hex"))).toBe(true);
    expect(Buffer.from(signed.at(-1) ?? []).equals(Buffer.from(keccak_256(ok)))).toBe(true);

    const bad = transferBody("0.0.7777", "0.0.4242", 200_000);
    const refused = await app.request("/agent/sign", {
      method: "POST",
      headers,
      body: JSON.stringify({ bodyBytes: Buffer.from(bad).toString("base64") }),
    });
    expect(refused.status).toBe(403);
  });

  it("uses the agent token as identity for licence holders", async () => {
    const { token } = (await (await link()).json()) as { token: string };
    const prompt = prompts[0] as (typeof prompts)[number];
    holders.add(`0.0.7777:${prompt.registryId}`);
    const res = await app.request(`/prompts/${prompt.id}/unlock`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const other = await app.request(`/prompts/${prompts[1]?.id}/unlock`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(other.status).toBe(402);
  });
});
