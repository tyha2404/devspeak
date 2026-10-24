import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
];

const nextConfig: NextConfig = {
  // E2E builds into its own directory so a running `next dev` can't clobber it.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Render metadata in <head> for every client (not streamed), so crawlers and audits always see it.
  htmlLimitedBots: /.*/,
  // Old URLs from before the grammar & vocabulary home became "/" and the career path moved to /career.
  async redirects() {
    return [
      { source: "/tracks", destination: "/", permanent: true },
      { source: "/tracks/:track(grammar|vocab)", destination: "/:track", permanent: true },
      { source: "/learn", destination: "/career", permanent: true },
      { source: "/path/:rest*", destination: "/career/path/:rest*", permanent: true },
      { source: "/practice", destination: "/career/practice", permanent: true },
      { source: "/topics", destination: "/career/topics", permanent: true },
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

export default nextConfig;
