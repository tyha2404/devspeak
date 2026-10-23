import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E builds into its own directory so a running `next dev` can't clobber it.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
