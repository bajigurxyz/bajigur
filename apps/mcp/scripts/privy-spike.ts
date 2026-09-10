import { PublicKey } from "@hiero-ledger/sdk";
import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { PrivateKey } from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { externalHederaSigner, privyRawSign, type RawSign } from "../src/externalSigner";

const api = process.env.BAJIGUR_API_URL ?? "http://localhost:3002";
const network = process.env.HEDERA_NETWORK ?? "testnet";
const id = process.argv[2] ?? "magnetic-buttons";
const mirror = `https://${network}.mirrornode.hedera.com/api/v1/accounts`;

async function signer() {
  const { PRIVY_APP_SECRET, PRIVY_WALLET_ID, PRIVY_WALLET_ADDRESS } = process.env;
  const PRIVY_APP_ID = process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (PRIVY_APP_ID && PRIVY_APP_SECRET && PRIVY_WALLET_ID && PRIVY_WALLET_ADDRESS) {
    const res = await fetch(`${mirror}/${PRIVY_WALLET_ADDRESS}`);
    if (!res.ok)
      throw new Error(`no Hedera account for ${PRIVY_WALLET_ADDRESS}; send it some HBAR first`);
    const account = (await res.json()) as { account: string; key: { key: string } };
    console.log(`mode: privy | wallet ${PRIVY_WALLET_ID} -> Hedera ${account.account}`);
    return externalHederaSigner(
      account.account,
      PublicKey.fromStringECDSA(account.key.key),
      privyRawSign(PRIVY_WALLET_ID, PRIVY_APP_ID, PRIVY_APP_SECRET),
    );
  }
  const key = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_KEY ?? "");
  const rawSign: RawSign = async (bodyBytes) => key.sign(bodyBytes);
  console.log("mode: local key through the same rawSign path (set PRIVY_* to use Privy)");
  return externalHederaSigner(process.env.HEDERA_OPERATOR_ID ?? "", key.publicKey, rawSign);
}

const client = x402Client.fromConfig({
  schemes: [{ network: "hedera:*", client: new ExactHederaScheme(await signer()) }],
});
const paid = wrapFetchWithPayment(fetch, client);
const res = await paid(`${api}/prompts/${id}/unlock`);
console.log(`status ${res.status}`);
const header = res.headers.get("PAYMENT-RESPONSE");
if (header) console.log("settlement:", Buffer.from(header, "base64").toString());
console.log((await res.text()).slice(0, 120));
