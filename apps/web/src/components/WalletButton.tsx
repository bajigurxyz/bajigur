"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { PRIVY_APP_ID } from "@/app/providers";

/** `0x1234…abcd` — enough to recognise, short enough for a button. */
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** The label a signed-in user recognises: their email, else their wallet. */
function accountLabel(email: string | undefined, address: string | undefined): string | undefined {
  if (email) return email;
  return address ? truncateAddress(address) : undefined;
}

/**
 * Sign-in control. Privy owns the whole flow — method choice, one-time codes,
 * OAuth, embedded-wallet creation — so this button only carries the two states
 * the pages care about: signed out, and signed in as someone.
 *
 * Signing in is not the same as being able to pay: that needs the wallet
 * delegated to Bajigur, which /connect handles.
 */
export default function WalletButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  // No app id means no Privy provider mounted, so the hooks above are inert.
  // Say so rather than rendering a button that can never do anything.
  if (!PRIVY_APP_ID) {
    return (
      <span className="text-xs text-gray-500">
        Sign-in unavailable — NEXT_PUBLIC_PRIVY_APP_ID is not set
      </span>
    );
  }

  if (!ready) {
    return (
      <span aria-live="polite" className="text-xs text-gray-500">
        Loading…
      </span>
    );
  }

  if (authenticated) {
    const label = accountLabel(user?.email?.address, user?.wallet?.address) ?? "Signed in";
    return (
      <div className="inline-flex items-center gap-2">
        <Link
          href="/connect"
          aria-label={`Signed in as ${label} — open wallet settings`}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 font-mono text-xs text-gray-700 transition-colors hover:border-black focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
        >
          <Wallet aria-hidden className="h-3.5 w-3.5" />
          {label}
        </Link>
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-full px-2 py-1 text-xs text-gray-500 transition-colors hover:text-black focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => login()}
      className="inline-flex w-fit items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <Wallet aria-hidden className="h-4 w-4" />
      Sign in
    </button>
  );
}
