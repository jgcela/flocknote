import { PrismaClient } from "@prisma/client";

/**
 * Raw Prisma client. NOT tenant-scoped: only use it for cross-tenant work
 * (sign-in lookup, sign-up, background jobs). Request handlers should use
 * `tenantDb(organizationId)` via `requireTenant()` instead.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
