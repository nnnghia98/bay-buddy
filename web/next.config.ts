import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.81.220.45"],
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
