"use client";

import Onboarding from "@/components/Onboarding";
import Skeleton, { SkeletonRegion } from "@/components/Skeleton";
import WalletButton from "@/components/WalletButton";
import { useOnboarding } from "@/lib/useOnboarding";

/**
 * Stands in front of anything that needs a wallet with a name.
 *
 * A signed-in account that has not finished gets the remaining steps here
 * rather than a page that half works: without a name a creator's prompts pay
 * the platform, and that is not a state worth letting someone reach and then
 * explaining afterwards.
 *
 * The marketplace is deliberately not behind this. Browsing is public, and a
 * visitor who has not signed in has nothing to finish here: they are asked to
 * sign in rather than shown a page whose every section is empty, which is what
 * this used to do.
 */
export default function RequireOnboarding({
  title,
  blurb,
  signedOutBlurb = "Sign in to see this.",
  children,
}: {
  title: string;
  blurb: string;
  /** What a visitor who has not signed in is told they are missing. */
  signedOutBlurb?: string;
  children: React.ReactNode;
}) {
  const onboarding = useOnboarding();

  if (onboarding.phase === "loading") {
    return (
      <SkeletonRegion label="Checking your account…" className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
      </SkeletonRegion>
    );
  }

  if (onboarding.phase === "signedOut") {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-600">{signedOutBlurb}</p>
        <div className="flex justify-center">
          <WalletButton />
        </div>
      </div>
    );
  }

  if (onboarding.phase === "complete") return <>{children}</>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm text-gray-600">{blurb}</p>
      </div>
      <Onboarding />
    </div>
  );
}
