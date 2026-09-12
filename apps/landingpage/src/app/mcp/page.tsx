import type { Metadata } from "next";
import AgentOnboarding from "@/components/AgentOnboarding";
import CodeBlock from "@/components/CodeBlock";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const MCP_URL = `${(process.env.NEXT_PUBLIC_MCP_URL ?? "http://localhost:3004").replace(/\/+$/, "")}/mcp`;

export const metadata: Metadata = {
  title: "Bajigur MCP | buy design prompts from your agent",
  description:
    "Connect Claude, Cursor or any MCP client to Bajigur. Search a catalogue of motion and web design prompts, and buy one over x402 on Hedera without holding a key.",
};

const TOOLS = [
  {
    name: "search_prompts",
    cost: "Free",
    input: "query (optional)",
    what: "Searches the catalogue by title, tags and preview text. Returns the id, price in both assets, and an animated preview URL when the creator supplied one.",
  },
  {
    name: "get_prompt",
    cost: "The listed price",
    input: "id",
    what: "Returns the full prompt text. Free when this wallet already holds the licence; otherwise it pays over x402, receives an onchain licence, and returns the Hedera transaction id alongside the text.",
  },
  {
    name: "my_licenses",
    cost: "Free",
    input: "none",
    what: "Lists what this wallet already owns. Those open again from any client, forever, without paying twice.",
  },
];

const FAQ = [
  {
    q: "Do I have to hold a private key?",
    a: "No. Privy creates a wallet for you and Bajigur signs each payment on your behalf, never above the cap on your token. Revoking the delegation in Privy stops it immediately.",
  },
  {
    q: "What does a prompt cost?",
    a: "Whatever its creator set, quoted in both USDC and HBAR. Your agent pays in whichever your wallet holds. The Hedera network fee is covered by the facilitator, so you never need gas.",
  },
  {
    q: "Does the money reach the creator?",
    a: "Directly. Each prompt's payout is resolved at payment time from the creator's name under bajigur.eth, so nothing is held in between and changing that record changes where the money lands.",
  },
  {
    q: "Can I connect without paying for anything?",
    a: "Yes. Without a token the catalogue still works and only buying is refused, so an agent can look around before you commit to anything.",
  },
  {
    q: "I already bought a prompt in one client. Does it work in another?",
    a: "Yes. The licence is an ERC-1155 token in your wallet rather than a row in our database, so any client signed in as that wallet opens it for free.",
  },
];

function Section({
  id,
  title,
  blurb,
  children,
}: {
  id: string;
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-normal tracking-tight text-black">{title}</h2>
        {blurb && <p className="max-w-2xl text-base leading-relaxed text-gray-600">{blurb}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * The page someone lands on when they hear "Bajigur has an MCP server".
 *
 * It answers three questions in the order they get asked: what can my agent do,
 * how do I connect it, and what happens when it spends money. The install
 * snippets are the same `AgentOnboarding` the home page uses, so the command
 * here can never drift from the command there.
 */
export default function McpDocsPage() {
  return (
    <div className="min-h-screen w-full bg-white">
      <Nav />

      <main className="mx-auto max-w-4xl px-6 pt-32 pb-24 sm:px-8">
        <header className="space-y-4 border-b border-gray-200 pb-10">
          <p className="font-mono text-xs tracking-widest text-gray-500 uppercase">
            Model Context Protocol
          </p>
          <h1 className="text-4xl font-normal tracking-tight text-black sm:text-5xl">
            Bajigur MCP
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-gray-600">
            A marketplace of motion and web design prompts your agent can search, buy and use on its
            own. Payment settles on Hedera over x402, the licence lands in your wallet, and you
            never hold a key or buy gas.
          </p>
          <CodeBlock
            label="The whole setup"
            code={`claude mcp add --transport http bajigur ${MCP_URL}`}
          />
        </header>

        <div className="space-y-16 pt-12">
          <Section
            id="what"
            title="What your agent gets"
            blurb="Three tools. Two are free, and only one ever spends anything."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 pr-4 font-medium text-black">Tool</th>
                    <th className="py-3 pr-4 font-medium text-black">Input</th>
                    <th className="py-3 pr-4 font-medium text-black">Cost</th>
                    <th className="py-3 font-medium text-black">What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {TOOLS.map((tool) => (
                    <tr key={tool.name} className="border-b border-gray-100 align-top">
                      <td className="py-4 pr-4">
                        <code className="font-mono text-xs text-black">{tool.name}</code>
                      </td>
                      <td className="py-4 pr-4 font-mono text-xs text-gray-600">{tool.input}</td>
                      <td className="py-4 pr-4 text-gray-600">{tool.cost}</td>
                      <td className="py-4 leading-relaxed text-gray-600">{tool.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            id="connect"
            title="Connect it"
            blurb="The server is hosted, so there is nothing to clone and no runtime to install. Pick your client."
          >
            <AgentOnboarding />
          </Section>

          <Section
            id="auth"
            title="Signing in"
            blurb="Two ways, depending on what your client supports."
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-base font-medium text-black">Let the client do it</h3>
                <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
                  Connect with no token at all. Browsing works straight away, and the first time
                  your agent tries to buy something the server answers with an authorization
                  challenge. Clients that support OAuth open a browser, you sign in with the same
                  email you use on Bajigur, and the purchase carries on. Nothing is pasted anywhere.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-medium text-black">Or carry a token</h3>
                <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
                  Some clients take a URL but not a custom header, and some you would rather
                  configure once. Sign in at{" "}
                  <a
                    href={`${APP_URL}/connect`}
                    className="underline underline-offset-2 hover:text-black"
                  >
                    {APP_URL.replace(/^https?:\/\//, "")}/connect
                  </a>{" "}
                  and copy the command it gives you, token already in place.
                </p>
                <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
                  Treat that token the way you would a card number. It lets an agent spend from your
                  wallet up to the cap shown on your profile, and revoking the delegation in Privy
                  kills it.
                </p>
              </div>
            </div>
          </Section>

          <Section
            id="payment"
            title="What happens when it buys"
            blurb="Four steps, all of them onchain and all of them checkable afterwards."
          >
            <ol className="max-w-2xl space-y-4">
              {[
                "Your agent calls get_prompt. The API answers 402 with the price in USDC and in HBAR, and the creator's own Hedera account as the payee.",
                "The client picks the asset your wallet actually holds, builds the transfer, and asks Bajigur to sign it with your delegated Privy wallet. The signature is refused if the amount is over your cap or the payee is not a Bajigur creator.",
                "The facilitator settles it and pays the network fee, so the transfer costs you nothing beyond the price itself.",
                "An ERC-1155 licence is minted to your wallet and the prompt text comes back with the Hedera transaction id. Asking again is free, from any client.",
              ].map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-500"
                  >
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-gray-600">{step}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="publish" title="Selling your own prompts">
            <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
              Claim a name under <code className="font-mono text-xs">bajigur.eth</code>, publish a
              prompt with a price in each asset, and every purchase pays your account directly.
              Bajigur registers the name for you and covers the gas, so you stay on Hedera
              throughout. It starts at{" "}
              <a
                href={`${APP_URL}/welcome`}
                className="underline underline-offset-2 hover:text-black"
              >
                {APP_URL.replace(/^https?:\/\//, "")}/welcome
              </a>
              .
            </p>
          </Section>

          <Section id="faq" title="Questions people actually ask">
            <dl className="max-w-2xl divide-y divide-gray-100 border-t border-gray-100">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="space-y-1.5 py-5">
                  <dt className="text-sm font-medium text-black">{q}</dt>
                  <dd className="text-sm leading-relaxed text-gray-600">{a}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="reference" title="Reference">
            <dl className="max-w-2xl space-y-3 text-sm">
              {[
                ["Endpoint", MCP_URL],
                ["Transport", "Streamable HTTP, stateless"],
                ["Authorization", "OAuth 2.1 with PKCE, or Bearer agent token"],
                ["Network", "Hedera testnet, settled through Blocky402"],
                ["Assets", "USDC (HTS) and HBAR"],
              ].map(([term, value]) => (
                <div key={term} className="flex flex-wrap gap-x-4 gap-y-1">
                  <dt className="w-40 shrink-0 text-gray-500">{term}</dt>
                  <dd className="font-mono text-xs break-all text-black">{value}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
