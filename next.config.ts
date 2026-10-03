import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
