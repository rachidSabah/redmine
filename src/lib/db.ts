import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql"; // Correct: PrismaLibSql (lowercase 'sql')
import { createClient } from "@libsql/client/web";     // Must use /web for Edge

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
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  // CRITICAL FIX: Do not throw an error during the Next.js build phase.
  // We return a dummy client so Next.js can finish "Collecting page data".
  if (!databaseUrl) {
    console.warn("WARNING: DATABASE_URL is missing. Returning empty PrismaClient for build compatibility.");
    return new PrismaClient();
  }

  // Create libSQL client for Turso
  const libsql = createClient({
    url: databaseUrl,
    authToken: authToken,
  });

  // Create Prisma adapter for libSQL
  const adapter = new PrismaLibSql({
    url: databaseUrl,
    authToken: authToken,
  });

  // Create Prisma client with the adapter
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" 
      ? ["query", "error", "warn"] 
      : ["error"],
  });
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export const db = prisma;
export default prisma;

export function getPrismaClient(): PrismaClient {
  return createPrismaClient();
}
