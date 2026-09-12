import Link from "next/link";

const HEDERA_FAUCET = "https://portal.hedera.com/faucet";

/**
 * What to do when a wallet has no Hedera account yet.
 *
 * Setting up payments is the whole answer and leads accordingly: apps/api
 * sends the account its first HBAR, associates USDC with a wallet-signed
 * transaction, and tops it up, so a new user goes login, connect, buy without
 * touching a faucet at all.
 *
 * The manual route is kept underneath because it is the way out if the
 * platform account ever runs dry, but it is a fallback, not the instruction.
 */
export default function ActivateAccount() {
  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 p-6">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-black">Activate your account</h3>
        <p className="text-sm text-gray-600">
          Nothing has reached this wallet yet, so Hedera has not created its account. Setting up
          payments does all of it: Bajigur sends the first HBAR, enables USDC, and adds a starting
          balance.
        </p>
      </div>

      <Link
        href="/connect"
        className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Set up payments
      </Link>

      <p className="border-t border-gray-200 pt-4 text-xs text-gray-500">
        Rather do it yourself? Send testnet HBAR to the wallet address above from the{" "}
        <a
          href={HEDERA_FAUCET}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-black"
        >
          Hedera portal faucet
        </a>
        . The account is created on arrival, and no account has to exist first.
      </p>
    </div>
  );
}
