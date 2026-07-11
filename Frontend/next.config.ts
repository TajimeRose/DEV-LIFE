import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.211.79.234"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
