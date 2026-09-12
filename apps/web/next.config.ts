import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The Hedera SDK and the x402 client are used only inside route handlers.
  // Left external, Next never tries to bundle their Node builtins.
  serverExternalPackages: ["@hiero-ledger/sdk", "@x402/hedera", "@x402/core", "@x402/fetch"],
  images: {
    // Creators' preview recordings, served from the catalogue's own bucket.
    remotePatterns: [
      { protocol: "https", hostname: "pub-86dc5b5484314368ac5436a674b0d919.r2.dev" },
    ],
  },
  // Next's router ignores directories beginning with a dot, so the OAuth
  // discovery documents are served from routes with ordinary names.
  async rewrites() {
    return [
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/well-known/oauth-authorization-server",
      },
      {
        source: "/.well-known/oauth-authorization-server/:path*",
        destination: "/api/well-known/oauth-authorization-server",
      },
    ];
  },
};

export default nextConfig;
