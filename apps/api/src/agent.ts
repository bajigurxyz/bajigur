import { proto } from "@hiero-ledger/proto";
import {
  AccountId,
  Client,
  Hbar,
  PrivateKey,
  PublicKey,
  TokenAssociateTransaction,
  TokenId,
  TransactionId,
  TransferTransaction,
} from "@hiero-ledger/sdk";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";
import { sha256 } from "@noble/hashes/sha256";
import { PrivyClient, verifyAccessToken } from "@privy-io/node";
import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { createRemoteJWKSet } from "jose";

/// Agent tokens let an MCP client pay from a Privy wallet the user delegated to Bajigur, without holding any key.
export type AgentClaims = {
  sub: string;
  wid: string;
  acct: string;
  pk: string;
  cap: string;
  iat: number;
};

export type Signer = { signHash(walletId: string, hash: Uint8Array): Promise<Uint8Array> };
export type Onboard = (evm: string, publicKey: PublicKey, walletId: string) => Promise<string>;

export type AgentOptions = {
  secret: string;
  signer?: Signer;
  onboard?: Onboard;
  allowedPayTo: () => Promise<Set<string>>;
  capUsd?: string;
  capHbar?: string;
  linkWallet?: (token: string) => Promise<{ sub: string; walletId: string; address: string }>;
  adminKey?: string;
};

const USDC = process.env.HEDERA_USDC_TOKEN_ID ?? "0.0.429274";
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const network = () => process.env.HEDERA_NETWORK ?? "testnet";
const mirror = () => `https://${network()}.mirrornode.hedera.com/api/v1`;

export const agentTokens = (secret: string) => ({
  issue: (claims: Omit<AgentClaims, "iat">) =>
    sign({ ...claims, iat: Math.floor(Date.now() / 1000) }, secret),
  verify: async (token: string) => (await verify(token, secret, "HS256")) as unknown as AgentClaims,
});

export const bearer = (headers: Headers) =>
  headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];

export function privySigner(): Signer | undefined {
  const appId = process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) return undefined;
  const privy = new PrivyClient({ appId, appSecret });
  const key = process.env.PRIVY_AUTHORIZATION_KEY;
  return {
    async signHash(walletId, hash) {
      const { signature } = await privy
        .wallets()
        .ethereum()
        .signSecp256k1(walletId, {
          params: { hash: `0x${hex(hash)}` },
          ...(key ? { authorization_context: { authorization_private_keys: [key] } } : {}),
        });
      return Buffer.from(signature.replace(/^0x/, ""), "hex");
    },
  };
}

// Privy exposes no public key for ethereum wallets; recover it from a signature over a fixed hash.
export async function recoverPublicKey(signer: Signer, walletId: string, address: string) {
  const hash = sha256(Buffer.from("bajigur:agent:public-key"));
  const sig = await signer.signHash(walletId, hash);
  const v = sig[64] ?? 0;
  const point = secp256k1.Signature.fromCompact(sig.subarray(0, 64))
    .addRecoveryBit(v >= 27 ? v - 27 : v)
    .recoverPublicKey(hash);
  const publicKey = PublicKey.fromBytesECDSA(point.toRawBytes(true));
  if (`0x${publicKey.toEvmAddress()}`.toLowerCase() !== address.toLowerCase()) {
    throw new Error("recovered public key does not match the wallet address");
  }
  return publicKey;
}

/// Accepts either the PEM from the dashboard or its JWKS URL.
/// The JWKS form is what survives a signing-key rotation: an app that has rotated
/// publishes both keys, and only the one matching the token's `kid` verifies it.
/// A static PEM silently becomes the wrong key and every login fails with
/// "Failed to verify authentication token".
function privyVerificationKey(value: string) {
  return value.startsWith("http") ? createRemoteJWKSet(new URL(value)) : value;
}

/// Verifies a Privy access token and returns the user's delegated ethereum wallet.
export function privyLinkWallet(): AgentOptions["linkWallet"] {
  const appId = process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  const verificationKey = process.env.PRIVY_VERIFICATION_KEY?.replace(/\\n/g, "\n");
  if (!appId || !appSecret || !verificationKey) return undefined;
  const key = privyVerificationKey(verificationKey);
  return async (token) => {
    const { user_id } = await verifyAccessToken({
      access_token: token,
      app_id: appId,
      verification_key: key,
    });
    const res = await fetch(`https://auth.privy.io/api/v1/users/${user_id}`, {
      headers: {
        "privy-app-id": appId,
        authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`,
      },
    });
    if (!res.ok) throw new Error(`privy user lookup ${res.status}`);
    const { linked_accounts } = (await res.json()) as {
      linked_accounts: {
        type: string;
        chain_type?: string;
        delegated?: boolean;
        id?: string | null;
        address?: string;
      }[];
    };
    const wallet = linked_accounts.find(
      (a) => a.type === "wallet" && a.chain_type === "ethereum" && a.delegated && a.id,
    );
    if (!wallet?.id || !wallet.address)
      throw new Error("no delegated ethereum wallet; add Bajigur as a signer first");
    return { sub: user_id, walletId: wallet.id, address: wallet.address };
  };
}

/// Creates the Hedera account for a Privy wallet (HBAR to its alias), associates USDC with a Privy-signed
/// transaction (which also completes the hollow account), and tops it up with a little USDC on testnet.
export function platformOnboard(signer: Signer): Onboard | undefined {
  const operator = process.env.X402_PAY_TO_ADDRESS;
  const key = process.env.X402_PAY_TO_KEY;
  if (!operator || !key) return undefined;
  const fundHbar = process.env.AGENT_FUND_HBAR ?? "5";
  const fundUsdc = Number(process.env.AGENT_FUND_USDC ?? "1") * 1_000_000;
  return async (evm, publicKey, walletId) => {
    const client = Client.forName(network()).setOperator(
      AccountId.fromString(operator),
      PrivateKey.fromStringECDSA(key),
    );
    try {
      const alias = AccountId.fromEvmAddress(0, 0, evm);
      let account = await accountOf(evm);
      if (!account) {
        await new TransferTransaction()
          .addHbarTransfer(AccountId.fromString(operator), Hbar.fromString(fundHbar).negated())
          .addHbarTransfer(alias, Hbar.fromString(fundHbar))
          .execute(client)
          .then((r) => r.getReceipt(client));
        for (let i = 0; i < 15 && !account; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          account = await accountOf(evm);
        }
        if (!account) throw new Error("Hedera account did not appear on the mirror node");
      }
      const id = AccountId.fromString(account);
      const associate = new TokenAssociateTransaction()
        .setAccountId(id)
        .setTokenIds([TokenId.fromString(USDC)])
        .setTransactionId(TransactionId.generate(id))
        .freezeWith(client);
      await associate.signWith(publicKey, async (body) =>
        (await signer.signHash(walletId, keccak_256(body))).subarray(0, 64),
      );
      await associate
        .execute(client)
        .then((r) => r.getReceipt(client))
        .catch((err) => {
          if (!String(err).includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) throw err;
        });
      // ponytail: testnet top-up is a courtesy; never fail onboarding over it
      if (fundUsdc > 0 && (await usdcBalance(account)) < fundUsdc) {
        await new TransferTransaction()
          .addTokenTransfer(TokenId.fromString(USDC), AccountId.fromString(operator), -fundUsdc)
          .addTokenTransfer(TokenId.fromString(USDC), id, fundUsdc)
          .execute(client)
          .then((r) => r.getReceipt(client))
          .catch((err) => console.warn("usdc top-up skipped:", String(err).slice(0, 120)));
      }
      return account;
    } finally {
      client.close();
    }
  };
}

async function usdcBalance(account: string) {
  const res = await fetch(`${mirror()}/accounts/${account}/tokens?token.id=${USDC}`);
  if (!res.ok) return 0;
  const { tokens } = (await res.json()) as { tokens: { balance: number }[] };
  return tokens[0]?.balance ?? 0;
}

async function accountOf(evm: string) {
  const res = await fetch(`${mirror()}/accounts/${evm}`);
  if (!res.ok) return undefined;
  const { account, key } = (await res.json()) as { account: string; key: unknown };
  return key === null && !account ? undefined : account;
}

/// Only a transfer that debits the agent's own account, credits a known creator, and stays under the cap gets signed.
export function checkTransfer(
  bodyBytes: Uint8Array,
  claims: Pick<AgentClaims, "acct" | "cap">,
  allowedPayTo: Set<string>,
  capHbar: string,
) {
  const body = proto.TransactionBody.decode(bodyBytes);
  if (body.data !== "cryptoTransfer" || !body.cryptoTransfer)
    throw new Error("only transfers can be signed");
  const acct = (a?: { accountNum?: { toString(): string } | number | null } | null) =>
    `0.0.${a?.accountNum?.toString() ?? "0"}`;
  const check = (rows: { account: string; amount: bigint }[], cap: bigint, what: string) => {
    let debit = 0n;
    for (const { account, amount } of rows) {
      if (amount < 0n) {
        if (account !== claims.acct)
          throw new Error(`debit from ${account} is not the agent's account`);
        debit -= amount;
      } else if (!allowedPayTo.has(account)) throw new Error(`${account} is not a Bajigur creator`);
    }
    if (debit > cap) throw new Error(`${what} amount ${debit} exceeds the cap ${cap}`);
  };
  const hbar = body.cryptoTransfer.transfers?.accountAmounts ?? [];
  check(
    hbar.map((x) => ({ account: acct(x.accountID), amount: BigInt(x.amount?.toString() ?? "0") })),
    BigInt(Math.round(Number(capHbar) * 1e8)),
    "HBAR",
  );
  for (const t of body.cryptoTransfer.tokenTransfers ?? []) {
    const token = `0.0.${t.token?.tokenNum?.toString() ?? "0"}`;
    if (token !== USDC) throw new Error(`token ${token} is not USDC`);
    check(
      (t.transfers ?? []).map((x) => ({
        account: acct(x.accountID),
        amount: BigInt(x.amount?.toString() ?? "0"),
      })),
      BigInt(Math.round(Number(claims.cap) * 1e6)),
      "USDC",
    );
  }
}

export function agentRoutes(o: AgentOptions) {
  const tokens = agentTokens(o.secret);
  const app = new Hono();
  app.onError((err, c) => c.json({ error: err.message }, 500));

  const authed = async (headers: Headers) => {
    const token = bearer(headers);
    if (!token) return undefined;
    return tokens.verify(token).catch(() => undefined);
  };

  app.post("/link", async (c) => {
    if (!o.signer) return c.json({ error: "agent wallets disabled" }, 503);
    const body = (await c.req.json().catch(() => ({}))) as {
      privyAccessToken?: string;
      walletId?: string;
      address?: string;
    };
    let link: { sub: string; walletId: string; address: string };
    if (body.privyAccessToken && o.linkWallet) {
      link = await o.linkWallet(body.privyAccessToken);
    } else if (
      body.walletId &&
      body.address &&
      o.adminKey &&
      c.req.header("x-bajigur-admin") === o.adminKey
    ) {
      link = { sub: `wallet:${body.walletId}`, walletId: body.walletId, address: body.address };
    } else {
      return c.json({ error: "privyAccessToken required" }, 400);
    }
    const publicKey = await recoverPublicKey(o.signer, link.walletId, link.address);
    const acct = o.onboard
      ? await o.onboard(link.address, publicKey, link.walletId)
      : ((await accountOf(link.address)) ?? "");
    if (!acct) return c.json({ error: "wallet has no Hedera account yet; send it some HBAR" }, 409);
    const cap = o.capUsd ?? "1";
    const token = await tokens.issue({
      sub: link.sub,
      wid: link.walletId,
      acct,
      pk: publicKey.toStringRaw(),
      cap,
    });
    return c.json({
      token,
      account: acct,
      address: link.address,
      publicKey: publicKey.toStringRaw(),
      cap,
    });
  });

  app.get("/me", async (c) => {
    const claims = await authed(c.req.raw.headers);
    if (!claims) return c.json({ error: "invalid agent token" }, 401);
    return c.json({
      account: claims.acct,
      publicKey: claims.pk,
      cap: claims.cap,
      walletId: claims.wid,
    });
  });

  app.post("/sign", async (c) => {
    const claims = await authed(c.req.raw.headers);
    if (!claims) return c.json({ error: "invalid agent token" }, 401);
    if (!o.signer) return c.json({ error: "agent wallets disabled" }, 503);
    const { bodyBytes } = (await c.req.json()) as { bodyBytes: string };
    const body = Buffer.from(bodyBytes, "base64");
    try {
      checkTransfer(body, claims, await o.allowedPayTo(), o.capHbar ?? "5");
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 403);
    }
    const sig = await o.signer.signHash(claims.wid, keccak_256(body));
    return c.json({ signature: hex(sig.subarray(0, 64)) });
  });

  return { app, identity: async (headers: Headers) => (await authed(headers))?.acct };
}
