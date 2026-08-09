import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next.js 16: reactCompiler is top-level, not under experimental
  reactCompiler: true,
};

export default nextConfig;
