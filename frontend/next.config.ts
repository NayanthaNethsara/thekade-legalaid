import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Ensure Turbopack uses this package as the workspace root
    // prevents Next from inferring the monorepo root incorrectly during build
    root: '.'
  }
};

export default nextConfig;
