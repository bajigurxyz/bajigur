import { HbarMark, UsdcMark } from "@/components/TokenMark";

const FAUCETS = [
  {
    label: "HBAR",
    href: "https://portal.hedera.com/faucet",
    mark: HbarMark,
    note: "Pays the network. Also what creates the account, if it does not exist yet.",
  },
  {
    label: "USDC",
    href: "https://faucet.circle.com/",
    mark: UsdcMark,
    note: "20 testnet USDC every two hours. Needs the Hedera account id, not the address.",
  },
] as const;

/**
 * Where to top the wallet up.
 *
 * Both are testnet faucets run by other people, so these are links out rather
 * than buttons that do something here. They open in a new tab so nobody loses
 * the page they were on.
 */
export default function Faucets() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FAUCETS.map(({ label, href, mark: Mark, note }) => (
        <div key={label} className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2">
            <Mark className="h-5 w-5" />
            <span className="text-sm font-semibold text-black">{label}</span>
          </div>
          <p className="flex-1 text-xs text-gray-600">{note}</p>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-black transition-colors hover:border-black focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Request {label}
          </a>
        </div>
      ))}
    </div>
  );
}
