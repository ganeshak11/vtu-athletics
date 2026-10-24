import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN access for mobile PWA testing
  allowedDevOrigins: ['*'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
