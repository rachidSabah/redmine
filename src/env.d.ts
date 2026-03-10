// Environment variable types for Cloudflare Pages

namespace NodeJS {
  interface ProcessEnv {
    // Database (Turso)
    DATABASE_URL: string;
    TURSO_AUTH_TOKEN?: string;
    
    // NextAuth
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    
    // Environment
    NODE_ENV: "development" | "production" | "test";
    
    // OAuth Providers (optional)
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
  }
}

// Cloudflare Pages environment bindings
interface CloudflareEnv {
  DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

// Extend global for Cloudflare Workers
declare global {
  const env: CloudflareEnv;
}
