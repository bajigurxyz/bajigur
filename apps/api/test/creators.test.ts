import { describe, expect, it } from "bun:test";
import { PrivateKey } from "@hiero-ledger/sdk";
import type { FacilitatorClient } from "@x402/core/server";
import { agentTokens } from "../src/agent";
import { createApp } from "../src/app";
import type { Prompt } from "../src/prompts";
import type { FeedbackRow } from "../src/store";

process.env.X402_PAY_TO_ADDRESS ??= "0.0.4242";

const CREATOR = "axel.bajigur.eth";
const CREATOR_ACCOUNT = "0.0.8291460";
const BUYER = "0.0.5555";
const key = PrivateKey.generateECDSA();

const rated: Prompt = {
  id: "rated-prompt",
  title: "Rated prompt",
  tags: ["test"],
  preview: "A prompt published by a creator with a name, used to exercise ratings.",
  priceUsd: "0.10",
  priceHbar: "1",
  registryId: 99,
  payTo: CREATOR_ACCOUNT,
  creator: CREATOR,
  body: "body",
};

const facilitator: FacilitatorClient = {
  getSupported: async () => ({ kinds: [], extensions: [], signers: {} }),
  verify: async () => ({ isValid: false }),
  settle: async () => ({ success: false, transaction: "", network: "hedera:testnet" }),
};

const records: Record<string, string> = {
  [`${CREATOR}:bajigur.hedera`]: CREATOR_ACCOUNT,
  [`${CREATOR}:erc8004`]: "eip155:296:0x8004A818BFB912233c491871b3d84c89A494BD9e:7",
};
const holders = new Set<string>();
const rows: FeedbackRow[] = [];
const given: { agentId: number; value: number; account: string }[] = [];
const published: unknown[] = [];

const app = createApp({
  facilitator,
  ens: { text: async (name, key_) => records[`${name}:${key_}`] ?? null },
  registry: {
    register: async () => ({ id: 1, transactionId: "0.0.1@2.0" }),
    issue: async () => {},
    hasLicence: async (account, id) => holders.has(`${account}:${id}`),
    buyers: async () => [],
    accountOf: async () => undefined,
    evmOf: async () => "0x00000000000000000000000000000000000015b3",
  },
  reputation: {
    registerCreator: async () => 7,
    summary: async () => ({ count: 1, value: 1 }),
    giveFeedback: async ({ agentId, value, account }) => {
      given.push({ agentId, value, account });
      return "0.0.5555@1789200000.000000000";
    },
  },
  store: {
    all: async () => [rated],
    add: async () => {},
    remove: async () => {},
    addFeedback: async (row) => {
      rows.push(row);
    },
    feedbackFor: async (creator) => rows.filter((r) => r.creator === creator),
    feedback: async (id) => rows.find((r) => r.id === id),
  },
  publish: async (message) => {
    published.push(message);
  },
  agent: { secret: "s", signer: { signHash: async () => new Uint8Array(65) } },
});

const token = (acct: string) =>
  agentTokens("s").issue({
    sub: "u",
    wid: "w1",
    acct,
    pk: key.publicKey.toStringRaw(),
    cap: "1",
  });

const rate = async (acct: string, body: unknown) =>
  app.request(`/creators/${CREATOR}/feedback`, {
    method: "POST",
    headers: { authorization: `Bearer ${await token(acct)}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("creator reputation", () => {
  it("is a public profile keyed by the ENS name", async () => {
    const res = await app.request(`/creators/${CREATOR}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      name: CREATOR,
      account: CREATOR_ACCOUNT,
      agentId: 7,
      agent: "eip155:296:0x8004A818BFB912233c491871b3d84c89A494BD9e:7",
    });
    expect((await app.request("/creators/nobody.bajigur.eth")).status).toBe(404);
  });

  it("refuses a rating from a wallet that never bought", async () => {
    const res = await rate(BUYER, { like: true });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "buy the prompt before rating it" });
  });

  it("records a buyer's like onchain and keeps the comment behind a URI", async () => {
    holders.add(`${BUYER}:99`);
    const res = await rate(BUYER, { like: true, comment: "Matches the preview exactly." });
    expect(res.status).toBe(201);
    const feedback = (await res.json()) as { id: string; transactionId: string; by: string };
    expect(given).toEqual([{ agentId: 7, value: 1, account: BUYER }]);
    expect(feedback.transactionId).toBe("0.0.5555@1789200000.000000000");

    const stored = await app.request(`/creators/${CREATOR}/feedback/${feedback.id}`);
    expect(await stored.json()).toMatchObject({ comment: "Matches the preview exactly." });

    const profile = (await (await app.request(`/creators/${CREATOR}`)).json()) as {
      reputation: { likes: number };
    };
    expect(profile.reputation.likes).toBe(1);
    expect(published).toHaveLength(1);
  });

  it("will not let a creator rate themselves", async () => {
    holders.add(`${CREATOR_ACCOUNT}:99`);
    const res = await rate(CREATOR_ACCOUNT, { like: true });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "you cannot rate yourself" });
  });

  it("serves the creator's ERC-8004 registration file", async () => {
    const res = await app.request(`/creators/${CREATOR}/agent.json`);
    expect(await res.json()).toMatchObject({
      registrations: [{ agentId: 7 }],
      services: [{ name: "ENS", endpoint: CREATOR }, {}],
    });
  });
});
