import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
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
 * Creates a Prisma client configured for Turso/libSQL
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  // During build time, return a basic PrismaClient without adapter
  // The adapter requires database connection which isn't needed during build
  if (!databaseUrl || process.env.VERCEL === "1" && !process.env.TURSO_AUTH_TOKEN) {
    console.warn("Build mode or missing credentials: returning basic PrismaClient");
    return new PrismaClient();
  }

  // Create libSQL client for Turso
  const libsql = createClient({
    url: databaseUrl,
    authToken: authToken,
  });

  // Create Prisma adapter for libSQL - pass the client instance
  const adapter = new PrismaLibSQL(libsql);

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
