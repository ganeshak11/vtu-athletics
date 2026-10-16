import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN access for mobile PWA testing
  allowedDevOrigins: ['*'],
};

export default nextConfig;
