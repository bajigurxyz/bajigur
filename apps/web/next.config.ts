import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The Hedera SDK and the x402 client are used only inside route handlers.
  // Left external, Next never tries to bundle their Node builtins.
  serverExternalPackages: ["@hiero-ledger/sdk", "@x402/hedera", "@x402/core", "@x402/fetch"],
};

export default nextConfig;
