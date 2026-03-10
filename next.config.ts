import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  
  // Trailing slashes for static hosting
  trailingSlash: true,
  
  // External packages for Edge runtime (Next.js 15 syntax)
  serverExternalPackages: ["@prisma/client", "prisma", "@libsql/client", "@prisma/adapter-libsql"],
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle native modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Fix for libsql packages - exclude non-JS files from being processed
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    // Exclude README, LICENSE, and other text files from being parsed as modules
    config.module.rules.push({
      test: /node_modules[\\\/]@libsql[\\\/].*\.(md|txt|license)$/i,
      type: 'javascript/auto',
      use: 'null-loader',
    });
    
    // Also exclude README and LICENSE from hrana-client
    config.module.rules.push({
      test: /node_modules[\\\/].*[\\\/]hrana-client[\\\/].*\.(md|txt|license)$/i,
      type: 'javascript/auto',
      use: 'null-loader',
    });
    
    return config;
  },
};

export default nextConfig;
