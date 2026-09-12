"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Nav from "@/components/Nav";
import Onboarding from "@/components/Onboarding";
import Skeleton, { SkeletonRegion } from "@/components/Skeleton";
import WalletButton from "@/components/WalletButton";
import { useOnboarding } from "@/lib/useOnboarding";

export default function WelcomePage() {
  const { ready, authenticated } = usePrivy();
  const onboarding = useOnboarding();
  const router = useRouter();

  // Someone who already holds a name has nothing to do here. Sending them to
  // the marketplace beats showing three ticked boxes and making them find the
  // way out themselves. `replace` so Back does not drop them straight back in.
  useEffect(() => {
    if (onboarding.phase === "complete") router.replace("/prompts");
  }, [onboarding.phase, router]);

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
        <header className="py-8">
          <h1 className="mb-3 text-3xl font-normal tracking-tight sm:text-4xl">
            Set up your account
          </h1>
          <p className="text-base text-gray-600">
            Three steps, and Bajigur pays for all of them. You will end up with a wallet, a Hedera
            account, and a name buyers can pay.
          </p>
        </header>

        {!ready && (
          <SkeletonRegion label="Loading your account…" className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
          </SkeletonRegion>
        )}

        {ready && !authenticated && (
          <div className="space-y-4 rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-600">Sign in to get started.</p>
            <div className="flex justify-center">
              <WalletButton />
            </div>
          </div>
        )}

        {ready && authenticated && (
          <div className="space-y-6">
            <Onboarding />
            <p className="text-sm text-gray-500">
              Want to look around first?{" "}
              <Link href="/prompts" className="underline hover:text-black">
                Browse the marketplace
              </Link>
              . Buying and publishing need the steps above.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
