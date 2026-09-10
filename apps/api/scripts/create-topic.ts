import { AccountId, Client, PrivateKey, TopicCreateTransaction } from "@hiero-ledger/sdk";

const operator = process.env.X402_PAY_TO_ADDRESS;
const key = process.env.X402_PAY_TO_KEY;
if (!operator || !key) {
  console.error("set X402_PAY_TO_ADDRESS and X402_PAY_TO_KEY in .env");
  process.exit(1);
}

const client = Client.forName(process.env.HEDERA_NETWORK ?? "testnet").setOperator(
  AccountId.fromString(operator),
  PrivateKey.fromStringECDSA(key),
);

const receipt = await new TopicCreateTransaction()
  .setTopicMemo("bajigur x402 settlement audit trail")
  .execute(client)
  .then((res) => res.getReceipt(client));

console.log(`HCS_TOPIC_ID=${receipt.topicId?.toString()}`);
client.close();
