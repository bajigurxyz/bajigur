import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // The one listing the transcript ends in, served from the catalogue's own
    // bucket. Hotlinked on purpose: it is the same recording apps/web renders,
    // so a copy here would be a second thing to keep in step with the listing.
    remotePatterns: [
      { protocol: "https", hostname: "pub-86dc5b5484314368ac5436a674b0d919.r2.dev" },
      // Sponsor marks, served by the event rather than copied into the repo.
      { protocol: "https", hostname: "cdn.ethglobal.com" },
      { protocol: "https", hostname: "encrypted-tbn0.gstatic.com" },
    ],
  },
};

export default nextConfig;
