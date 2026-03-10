import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static export for Cloudflare Pages Functions support
  output: undefined,
  
  // Disable image optimization (use Cloudflare Images instead)
  images: {
    unoptimized: true,
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable React strict mode for edge compatibility
  reactStrictMode: false,
  
  // FIX: Add Turbopack config to silence Next.js 16 warning
  experimental: {
    turbopack: {},
    serverComponentsExternalPackages: ["@prisma/client", "prisma", "@libsql/client"],
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle native modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
