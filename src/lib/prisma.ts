import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// PostgreSQL adapter for Prisma client
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || "" });
// Global reference to prevent multiple Prisma instances in development
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
