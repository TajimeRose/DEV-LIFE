import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.211.79.234", "10.77.65.234"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
