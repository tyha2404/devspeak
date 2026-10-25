import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
];

const nextConfig: NextConfig = {
  // Render metadata in <head> for every client (not streamed), so crawlers and audits always see it.
  htmlLimitedBots: /.*/,
  // Old URLs: the former /tracks area is now the site root, and the career path was removed.
  async redirects() {
    return [
      { source: "/tracks", destination: "/", permanent: true },
      { source: "/tracks/:track(grammar|vocab)", destination: "/:track", permanent: true },
      { source: "/exam/test-out/:id", destination: "/test-out/:id", permanent: true },
      ...["/learn", "/career/:rest*", "/path/:rest*", "/practice", "/topics", "/onboarding"].map(
        (source) => ({ source, destination: "/", permanent: true }),
      ),
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Game assets are content-addressed by build; cache hard.
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default function config(phase: string): NextConfig {
  return {
    ...nextConfig,
    // Concurrent dev, production and E2E builds must not overwrite each other's chunks.
    distDir:
      process.env.NEXT_DIST_DIR ?? (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"),
  };
}
