/**
 * Edge-Compatible Prisma Client for Cloudflare Pages + Turso
 * 
 * This module creates a Prisma client that works in the Cloudflare Edge runtime
 * using the @prisma/adapter-libsql driver adapter to connect to Turso.
 * 
 * Configuration Requirements:
 * - DATABASE_URL: libsql://your-db.turso.io
 * - TURSO_AUTH_TOKEN: Your Turso authentication token
 * - nodejs_compat flag enabled in wrangler.toml
 */

import { PrismaClient } from "@prisma/client";
import PrismaLibSQL from "@prisma/adapter-libsql";  // FIXED: Use default import
import { createClient } from "@libsql/client";

// Type for global prisma instance
type GlobalForPrisma = {
  prisma: PrismaClient | undefined;
};

// Declare global for hot reloading in development
declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Creates a Prisma client configured for the Edge runtime
 * Uses the libSQL adapter for Turso database connections
 */
function createPrismaClient(): PrismaClient {
  // Get database URL and auth token from environment
  const databaseUrl = process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Create libSQL client for Turso
  const libsql = createClient({
    url: databaseUrl,
    authToken: authToken,
  });

  // Create Prisma adapter for libSQL
  const adapter = new PrismaLibSQL(libsql);

  // Create Prisma client with the adapter
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" 
      ? ["query", "error", "warn"] 
      : ["error"],
  });
}

/**
 * Prisma client instance
 * 
 * In development, we use a global variable to preserve the instance
 * across hot reloads. In production (including Cloudflare Pages),
 * we create a new instance each time.
 */
export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

// Alias for convenience
export const db = prisma;

// Export default
export default prisma;

/**
 * Helper function to get Prisma client in Edge Workers
 * Use this in Cloudflare Pages Functions where global state
 * may not be available
 */
export function getPrismaClient(): PrismaClient {
  return createPrismaClient();
}
