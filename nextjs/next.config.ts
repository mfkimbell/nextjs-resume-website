import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/api/taipei/photos": ["./public/taipei/**/*"],
  },
};

export default nextConfig;
