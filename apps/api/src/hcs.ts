import {
  AccountId,
  Client,
  PrivateKey,
  TopicId,
  TopicMessageSubmitTransaction,
} from "@hiero-ledger/sdk";

export type Settlement = {
  promptId: string;
  payer: string;
  payTo: string;
  asset: string;
  amount: string;
  network: string;
  transaction: string;
  at: string;
};

export type OnSettled = (settlement: Settlement) => Promise<void>;

export function hcsPublisher(): OnSettled | undefined {
  const topic = process.env.HCS_TOPIC_ID;
  const operator = process.env.X402_PAY_TO_ADDRESS;
  const key = process.env.X402_PAY_TO_KEY;
  if (!topic || !operator || !key) {
    console.warn(
      "HCS audit trail disabled: set HCS_TOPIC_ID, X402_PAY_TO_ADDRESS and X402_PAY_TO_KEY",
    );
    return undefined;
  }
  const network = process.env.HEDERA_NETWORK ?? "testnet";
  const client = Client.forName(network).setOperator(
    AccountId.fromString(operator),
    PrivateKey.fromStringECDSA(key),
  );
  const topicId = TopicId.fromString(topic);

  return async (settlement) => {
    await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(JSON.stringify(settlement))
      .execute(client)
      .then((res) => res.getReceipt(client));
  };
}
