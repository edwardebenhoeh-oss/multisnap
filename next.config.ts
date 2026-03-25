import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow large base64 image payloads in API routes
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
