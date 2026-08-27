/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Images are self-hosted procedurally; keep the default loader to avoid external domains.
  images: {
    unoptimized: true,
  },
  // Allow the platform's live-preview host to fetch dev assets cross-origin.
  allowedDevOrigins: ['*.e2b.app', 'localhost'],
  // Give the P2P/game canvas plenty of CPU.
  experimental: {
    optimizePackageImports: [],
  },
};

export default nextConfig;
