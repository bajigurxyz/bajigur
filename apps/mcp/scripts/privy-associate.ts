import { AccountId, TokenAssociateTransaction, TokenId, TransactionId } from "@hiero-ledger/sdk";
import { createHederaClient } from "@x402/hedera";
import { privyRawSign, privyWallet } from "../src/externalSigner";

const appId = process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const { PRIVY_APP_SECRET: secret, PRIVY_WALLET_ID: walletId } = process.env;
if (!appId || !secret || !walletId) {
  console.error("set NEXT_PUBLIC_PRIVY_APP_ID, PRIVY_APP_SECRET and PRIVY_WALLET_ID in .env");
  process.exit(1);
}
const network = `hedera:${process.env.HEDERA_NETWORK ?? "testnet"}`;
const usdc = TokenId.fromString(process.env.HEDERA_USDC_TOKEN_ID ?? "0.0.429274");

const wallet = await privyWallet(walletId, appId, secret);
const res = await fetch(
  `https://${network.split(":")[1]}.mirrornode.hedera.com/api/v1/accounts/${wallet.address}`,
);
if (!res.ok) throw new Error(`no Hedera account for ${wallet.address}; send it some HBAR first`);
const { account: accountId } = (await res.json()) as { account: string };
const account = AccountId.fromString(accountId);
console.log(`privy wallet ${wallet.address} -> Hedera ${accountId}`);

const client = createHederaClient(network);
try {
  const tx = new TokenAssociateTransaction()
    .setAccountId(account)
    .setTokenIds([usdc])
    .setTransactionId(TransactionId.generate(account))
    .freezeWith(client);
  await tx.signWith(wallet.publicKey, privyRawSign(walletId, appId, secret));
  const receipt = await tx.execute(client).then((r) => r.getReceipt(client));
  console.log(`${accountId} associated with ${usdc}: ${receipt.status.toString()}`);
} catch (err) {
  if (String(err).includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT"))
    console.log(`${accountId} already associated`);
  else throw err;
} finally {
  client.close();
}
