/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Images are self-hosted procedurally; keep the default loader to avoid external domains.
  images: {
    unoptimized: true,
  },
  // Allow the platform's live-preview host to fetch dev assets cross-origin.
  allowedDevOrigins: ['*.e2b.app', 'localhost'],
  // Anchor the build trace to this app so Vercel packages the right files even
  // when the repo is checked out inside a larger monorepo/workspace.
  outputFileTracingRoot: import.meta.dirname,
  // Give the P2P/game canvas plenty of CPU.
  experimental: {
    optimizePackageImports: [],
  },
};

export default nextConfig;
