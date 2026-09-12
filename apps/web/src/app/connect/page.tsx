import ConnectPanel from "@/components/ConnectPanel";
import Nav from "@/components/Nav";

export const metadata = {
  title: "Connect your wallet | Bajigur",
  description: "Set up payments so your agent can buy prompts on Hedera.",
};

export default function ConnectPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <header className="py-8">
          <h1 className="mb-3 text-3xl font-normal tracking-tight sm:text-4xl">
            Connect your wallet
          </h1>
        </header>
        <ConnectPanel />
      </main>
    </div>
  );
}
