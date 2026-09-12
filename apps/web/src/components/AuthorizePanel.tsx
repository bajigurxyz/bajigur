"use client";

import { useDelegatedActions, usePrivy, useSigners } from "@privy-io/react-auth";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useEmbeddedWallet } from "@/lib/useEmbeddedWallet";

const SIGNER_ID = process.env.NEXT_PUBLIC_PRIVY_SIGNER_ID;

type Step = "idle" | "working" | "error";

/**
 * Consent screen for an MCP client.
 *
 * Signing in here is the same Privy sign-in as the web app, so the same email
 * always reaches the same wallet, the same Hedera account and the same
 * licences. Approving from Claude does not create a second identity.
 */
export default function AuthorizePanel({
  clientId,
  redirectUri,
  codeChallenge,
  codeChallengeMethod,
  state,
}: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state?: string;
}) {
  const { ready, authenticated, login, getAccessToken, user } = usePrivy();
  const wallet = useEmbeddedWallet();
  const { delegateWallet } = useDelegatedActions();
  const { addSigners } = useSigners();
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState("");

  const missing = !clientId || !redirectUri || !codeChallenge;
  const badMethod = codeChallengeMethod !== "S256";

  const approve = async () => {
    setStep("working");
    setMessage("");
    try {
      let address = wallet.address;
      if (!address) {
        await wallet.create();
        address = wallet.address;
        if (!address) throw new Error("Could not create a wallet for you.");
      }
      const delegated = user?.linkedAccounts.some(
        (account) => account.type === "wallet" && "delegated" in account && account.delegated,
      );
      if (!delegated) {
        await delegateWallet({ address, chainType: "ethereum" });
        if (SIGNER_ID) await addSigners({ address, signers: [{ signerId: SIGNER_ID }] });
      }
      const privyAccessToken = await getAccessToken();
      const res = await fetch("/api/oauth/authorize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ privyAccessToken, clientId, redirectUri, codeChallenge, state }),
      });
      const data = (await res.json()) as { redirect?: string; error_description?: string };
      if (!res.ok || !data.redirect) throw new Error(data.error_description ?? "Approval failed.");
      window.location.href = data.redirect;
    } catch (err) {
      setStep("error");
      setMessage(err instanceof Error ? err.message : "Approval failed.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <main className="w-full max-w-md space-y-6">
        <Image
          src="/logo.png"
          alt="Bajigur"
          width={48}
          height={48}
          className="h-12 w-12"
          priority
        />

        {missing || badMethod ? (
          <div role="alert" className="space-y-2">
            <h1 className="text-2xl font-normal tracking-tight">This link is incomplete</h1>
            <p className="text-sm text-gray-600">
              {badMethod
                ? "The client did not use PKCE with S256, which Bajigur requires."
                : "Open this page from your MCP client rather than directly."}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl font-normal tracking-tight">Connect your agent</h1>
              <p className="text-sm text-gray-600">
                An MCP client wants to buy prompts from your Bajigur wallet.
              </p>
            </div>

            <ul className="space-y-1.5 rounded-2xl border border-gray-200 p-5 text-sm text-gray-600">
              <li>It can search the catalogue and read prompts you own.</li>
              <li>It can buy prompts, paying only Bajigur creators.</li>
              <li>Every payment is capped, and you can revoke it in Privy.</li>
            </ul>

            {!ready ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : !authenticated ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Sign in with the same account you use on Bajigur. Same account, same wallet, same
                  licences.
                </p>
                <button
                  type="button"
                  onClick={() => login()}
                  className="w-full rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Sign in to continue
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {user?.email?.address && (
                  <p className="text-sm text-gray-600">Signed in as {user.email.address}</p>
                )}
                <button
                  type="button"
                  onClick={approve}
                  disabled={step === "working"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
                >
                  {step === "working" && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                  {step === "working" ? "Approving…" : "Approve"}
                </button>
              </div>
            )}

            {step === "error" && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
              >
                {message}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
