import { PrismaClient } from "@prisma/client";

// Type for global prisma instance
type GlobalForPrisma = {
  prisma: PrismaClient | undefined;
};

// Declare global for hot reloading in development
declare global {
  var prisma: PrismaClient | undefined;
}

// Create Prisma client - will connect at runtime, not build time
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
