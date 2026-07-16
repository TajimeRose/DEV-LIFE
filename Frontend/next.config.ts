import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  allowedDevOrigins: [
    "10.117.153.234",
    "10.117.153.234:3000",
  ],

  experimental: {
    serverActions: {
      allowedOrigins: [
        "10.117.153.234",
        "10.117.153.234:3000",
      ],
    },
  },
};

export default nextConfig;