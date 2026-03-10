import { PrismaClient } from "@prisma/client";

// Type for global prisma instance
type GlobalForPrisma = {
  prisma: PrismaClient | undefined;
};

// Declare global for hot reloading in development
declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Creates a Prisma client
 * For Vercel/Node.js: uses standard Prisma client
 * Note: The DATABASE_URL should point to a libsql:// URL for Turso
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
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
