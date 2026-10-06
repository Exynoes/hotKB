import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // L'API REST et Socket.IO sont servis par le même processus (server/src/index.ts).
};

export default nextConfig;
