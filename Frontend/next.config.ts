import type { NextConfig } from "next";
import path from "path";

const developmentOrigins = [
  "10.117.153.234",
  "10.117.153.234:3000",
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  ...(process.env.NODE_ENV === "development" && {
    allowedDevOrigins: developmentOrigins,
    experimental: {
      serverActions: {
        allowedOrigins: developmentOrigins,
      },
    },
  }),
};

export default nextConfig;