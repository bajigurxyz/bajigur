import { AccountId, Client, PrivateKey, TokenAssociateTransaction, TokenId } from "@x402/hedera";

const accountId = process.env.HEDERA_ACCOUNT_ID;
const privateKey = process.env.HEDERA_PRIVATE_KEY;
const usdc = process.env.HEDERA_USDC_TOKEN_ID ?? "0.0.429274";

if (!accountId || !privateKey) {
  console.error(
    "usage: HEDERA_ACCOUNT_ID=0.0.x HEDERA_PRIVATE_KEY=<hex> bun scripts/associate-usdc.ts",
  );
  process.exit(1);
}

const account = AccountId.fromString(accountId);
const client = Client.forTestnet().setOperator(account, PrivateKey.fromStringECDSA(privateKey));

try {
  const receipt = await new TokenAssociateTransaction()
    .setAccountId(account)
    .setTokenIds([TokenId.fromString(usdc)])
    .execute(client)
    .then((res) => res.getReceipt(client));
  console.log(`${accountId} associated with ${usdc}: ${receipt.status.toString()}`);
} catch (err) {
  const message = String(err);
  if (message.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
    console.log(`${accountId} already associated with ${usdc}`);
  } else {
    throw err;
  }
} finally {
  client.close();
}
