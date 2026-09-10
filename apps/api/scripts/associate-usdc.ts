import { AccountId, Client, PrivateKey, TokenAssociateTransaction, TokenId } from "@x402/hedera";

const usdc = TokenId.fromString(process.env.HEDERA_USDC_TOKEN_ID ?? "0.0.429274");

const accounts = [
  ["payer", process.env.HEDERA_OPERATOR_ID, process.env.HEDERA_OPERATOR_KEY],
  ["payTo", process.env.X402_PAY_TO_ADDRESS, process.env.X402_PAY_TO_KEY],
] as const;

async function associate(id: string, key: string) {
  const account = AccountId.fromString(id);
  const client = Client.forTestnet().setOperator(account, PrivateKey.fromStringECDSA(key));
  try {
    const receipt = await new TokenAssociateTransaction()
      .setAccountId(account)
      .setTokenIds([usdc])
      .execute(client)
      .then((res) => res.getReceipt(client));
    return receipt.status.toString();
  } catch (err) {
    if (String(err).includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) return "already associated";
    throw err;
  } finally {
    client.close();
  }
}

for (const [role, id, key] of accounts) {
  if (!id || !key) {
    console.log(`${role}: skipped, set both the account id and its private key in .env`);
    continue;
  }
  console.log(`${role} ${id} -> USDC ${usdc}: ${await associate(id, key)}`);
}
