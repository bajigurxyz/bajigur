import Link from "next/link";
import CopyButton from "@/components/CopyButton";

const HEDERA_FAUCET = "https://portal.hedera.com/faucet";
const CIRCLE_FAUCET = "https://faucet.circle.com/";

/**
 * What to do when a wallet has no Hedera account yet.
 *
 * A Hedera account is not created with the wallet. It comes into existence the
 * first time something is sent to the address, so the wallet has to be
 * activated before it can hold anything or pay for anything.
 *
 * The order matters and is why this is numbered: Circle's faucet sends USDC to
 * a Hedera account id, and that id does not exist until HBAR has arrived. Ask
 * for the USDC first and there is nowhere for it to go.
 */
export default function ActivateAccount({ address }: { address?: string }) {
  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 p-6">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-black">Activate your account</h3>
        <p className="text-sm text-gray-600">
          Nothing has reached this wallet yet, so Hedera has not created its account. Send it some
          HBAR and the account is created on arrival.
        </p>
      </div>

      <ol className="space-y-4 text-sm text-gray-600">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
            1
          </span>
          <div className="space-y-2">
            <p>
              Get testnet HBAR from the{" "}
              <a
                href={HEDERA_FAUCET}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-black"
              >
                Hedera portal faucet
              </a>{" "}
              and send it to your wallet address.
            </p>
            {address && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
                <code className="truncate font-mono text-xs text-black">{address}</code>
                <CopyButton text={address} label="your wallet address" />
              </div>
            )}
          </div>
        </li>

        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
            2
          </span>
          <p>
            Your Hedera account id appears here. Once it does, get testnet USDC from{" "}
            <a
              href={CIRCLE_FAUCET}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-black"
            >
              Circle&apos;s faucet
            </a>
            , which asks for that id rather than the address above.
          </p>
        </li>
      </ol>

      <p className="border-t border-gray-200 pt-4 text-xs text-gray-500">
        Prefer not to do any of this?{" "}
        <Link href="/connect" className="underline hover:text-black">
          Set up payments
        </Link>{" "}
        and Bajigur funds the account for you.
      </p>
    </div>
  );
}
