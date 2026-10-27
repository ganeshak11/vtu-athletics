import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*', '*.ngrok-free.dev', '*.ngrok.io', 'manmade-navigator-hurled.ngrok-free.dev'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
